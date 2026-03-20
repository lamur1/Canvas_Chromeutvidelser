// Flagg som settes kun når bruker aktivt ber om innsetting
let innsettingAktiv = false;

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'sett-inn-mal') await settInnMal();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sett-inn-mal') {
    settInnMal().then(sendResponse);
    return true;
  }
});

async function settInnMal() {
  // Hindre at flere samtidige innsettinger starter
  if (innsettingAktiv) return { feil: 'Innsetting pågår allerede' };
  innsettingAktiv = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.includes('speed_grader')) return { feil: 'Ikke Speed Grader' };

    const storage = await chrome.storage.local.get('malUrl');
    if (!storage.malUrl) return { feil: 'Ingen mal-URL lagret. Lim inn URL i utvidelsen først.' };

    // Hent elevinfo
    const infoResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        try {
          const navnEl = document.querySelector('[data-testid="selected-student"] span span');
          const fornavn = navnEl ? navnEl.innerText.trim().split(' ')[0] : null;
          const tittelEl = document.querySelector('[data-testid="assignment-link"]');
          const tittel = tittelEl ? tittelEl.innerText.trim() : null;
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ||
            decodeURIComponent((document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]*)/) || [])[1] || '');
          return { fornavn, tittel, csrfToken };
        } catch (e) { return null; }
      }
    });

    const info = infoResultat?.[0]?.result;
    if (!info?.fornavn) return { feil: 'Fant ikke elevnavn' };

    // Hent mal fra Canvas-siden
    const malResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (malUrl, oppgavetittel, csrfToken) => {
        try {
          const match = malUrl.match(/\/courses\/(\d+)\/pages\/([^/?#]+)/);
          if (!match) return { feil: 'Ugyldig Canvas-URL' };
          const res = await fetch(`/api/v1/courses/${match[1]}/pages/${match[2]}`, {
            headers: { 'Accept': 'application/json', 'X-CSRF-Token': csrfToken }
          });
          if (!res.ok) return { feil: `Kunne ikke hente siden: HTTP ${res.status}` };
          const data = await res.json();
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.body, 'text/html');
          const datarader = Array.from(doc.querySelectorAll('table tr')).slice(1);
          let funnetMal = null;
          for (const rad of datarader) {
            const celler = rad.querySelectorAll('td');
            if (celler.length >= 2 && celler[0].textContent.trim() === oppgavetittel) {
              funnetMal = celler[1].innerHTML; break;
            }
          }
          if (!funnetMal && oppgavetittel) {
            for (const rad of datarader) {
              const celler = rad.querySelectorAll('td');
              if (celler.length >= 2) {
                const t = celler[0].textContent.trim();
                if (t && (oppgavetittel.includes(t) || t.includes(oppgavetittel))) {
                  funnetMal = celler[1].innerHTML; break;
                }
              }
            }
          }
          if (!funnetMal) {
            for (const rad of datarader) {
              const celler = rad.querySelectorAll('td');
              if (celler.length >= 2 && celler[1].innerHTML.trim()) { funnetMal = celler[1].innerHTML; break; }
            }
          }
          if (!funnetMal) return { feil: `Fant ingen mal. Oppgavetittel: "${oppgavetittel}"` };
          return { mal: funnetMal };
        } catch (e) { return { feil: e.message }; }
      },
      args: [storage.malUrl, info.tittel, info.csrfToken]
    });

    const malRes = malResultat?.[0]?.result;
    if (!malRes?.mal) return { feil: malRes?.feil || 'Fant ingen mal' };

    // Vent til editor er klar, fokuser og sett inn – startes kun på brukers forespørsel
    const innSettingResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (mal, fornavn) => {
        return new Promise((resolve) => {
          const TIMEOUT = 15000;
          let avsluttet = false;
          let domObserver = null;

          const tidsbegrensning = setTimeout(() => {
            if (!avsluttet) {
              avsluttet = true;
              if (domObserver) domObserver.disconnect();
              resolve({ ok: false, feil: 'Tidsavbrudd: editor ikke klar innen 15 sekunder' });
            }
          }, TIMEOUT);

          function finnSendKnapp() {
            return document.querySelector('button[data-testid="submit-comment-button"]');
          }

          function finnKlarEditor() {
            if (typeof tinymce === 'undefined') return null;
            // Vel berre den editoren som er synleg i DOM (ikkje kommentarbibliotek-editoren)
            const editor = tinymce.editors.find(e =>
              e.id?.startsWith('rce-') &&
              e.initialized &&
              e.getContainer()?.offsetParent !== null
            );
            if (!editor) return null;
            // Vent til TinyMCEs eget snurrehjul er ferdig
            const throbber = editor.getContainer()?.querySelector('.tox-throbber');
            if (throbber && throbber.style.display !== 'none') return null;
            return editor;
          }

          function fokuserOgSettInn(editor) {
            if (avsluttet) return;
            avsluttet = true;
            clearTimeout(tidsbegrensning);
            if (domObserver) domObserver.disconnect();

            editor.getBody()?.click();
            editor.focus();

            const medNavn = mal.replace(/@fornavn/gi, fornavn);
            editor.setContent(medNavn);
            editor.fire('input');
            editor.fire('change');
            editor.selection.select(editor.getBody(), true);
            editor.selection.collapse(false);
            editor.focus();
            editor.execCommand('mceInsertContent', false, '\u200B');
            editor.fire('input');
            editor.fire('change');
            editor.setContent(editor.getContent().replace(/\u200B/g, ''));
            editor.fire('input');
            editor.fire('change');
            const textarea = document.getElementById(editor.id);
            if (textarea) {
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
            resolve({ ok: true });
          }

          // Forsøk 1: alt allerede klart?
          const editor = finnKlarEditor();
          if (editor && finnSendKnapp()) { fokuserOgSettInn(editor); return; }

          let editorKlar = false;
          let sendKnappKlar = false;
          let klarEditor = null;

          function sjekkOgSettInn() {
            if (avsluttet) return;
            if (editorKlar && sendKnappKlar) fokuserOgSettInn(klarEditor);
          }

          function registrerTinyMCELytter() {
            tinymce.on('AddEditor', ({ editor }) => {
              if (!editor.id?.startsWith('rce-')) return;
              editor.on('init', () => {
                if (avsluttet) return;
                klarEditor = editor;
                editorKlar = true;
                sjekkOgSettInn();
              });
            });
            const e = finnKlarEditor();
            if (e) { klarEditor = e; editorKlar = true; sjekkOgSettInn(); }
          }

          // Observer startes kun her – på brukers forespørsel, ikke ved sideinnlasting
          domObserver = new MutationObserver(() => {
            if (avsluttet) { domObserver.disconnect(); return; }
            if (!sendKnappKlar && finnSendKnapp()) { sendKnappKlar = true; sjekkOgSettInn(); }
            if (typeof tinymce !== 'undefined') {
              const e = finnKlarEditor();
              if (e && !editorKlar) { klarEditor = e; editorKlar = true; sjekkOgSettInn(); }
            }
            if (!editorKlar && typeof tinymce !== 'undefined') registrerTinyMCELytter();
          });

          domObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
          if (typeof tinymce !== 'undefined') registrerTinyMCELytter();
          if (finnSendKnapp()) { sendKnappKlar = true; sjekkOgSettInn(); }
        });
      },
      args: [malRes.mal, info.fornavn]
    });

    const innSettingRes = innSettingResultat?.[0]?.result;
    if (!innSettingRes?.ok) return { feil: innSettingRes?.feil || 'Innsetting mislyktes' };
    return { ok: true };

  } finally {
    innsettingAktiv = false;
  }
}
