// Flagg som settes kun når bruker aktivt ber om innsetting
let innsettingAktiv = false;

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'sett-inn-kommentar') await settInnKommentar();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sett-inn-kommentar') {
    settInnKommentar().then(sendResponse);
    return true;
  }
  if (message.action === 'start-debug') {
    startDebug();
    return true;
  }
});

// ─── DEBUG-FUNKSJON ───────────────────────────────────────────────────────────
async function startDebug() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes('speed_grader')) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: () => {
      console.log('%c[DEBUG SPINNER] Overvåker startet', 'color: purple; font-weight: bold');

      const SPINNER_TEGN = ['spinner', 'loading', 'load', 'progress', 'spin', 'pending', 'skeleton', 'placeholder'];

      function erSpinnerElement(el) {
        if (!(el instanceof Element)) return false;
        const kombinert = [(el.className || '').toString(), el.id || '',
          el.getAttribute('role') || '', el.getAttribute('aria-label') || ''].join(' ').toLowerCase();
        return SPINNER_TEGN.some(ord => kombinert.includes(ord));
      }

      function loggElement(prefiks, el) {
        const tag = el.tagName?.toLowerCase() || '?';
        const id = el.id ? `#${el.id}` : '';
        const role = el.getAttribute('role') ? `[role="${el.getAttribute('role')}"]` : '';
        const label = el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : '';
        console.log(`%c${prefiks}`, 'color: darkorange; font-weight: bold',
          `${tag}${id}${role}${label}`, `class: "${(el.className || '').toString()}"`);
      }

      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of mut.addedNodes) {
            if (erSpinnerElement(node)) loggElement('[SPINNER DUKKET OPP]', node);
            if (node.querySelectorAll) node.querySelectorAll('*').forEach(b => {
              if (erSpinnerElement(b)) loggElement('[SPINNER DUKKET OPP (barn)]', b);
            });
          }
          for (const node of mut.removedNodes) {
            if (erSpinnerElement(node)) loggElement('[SPINNER FORSVANT]', node);
          }
          if (mut.type === 'attributes' && erSpinnerElement(mut.target))
            loggElement('[SPINNER KLASSE ENDRET]', mut.target);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });

      if (typeof tinymce !== 'undefined') {
        tinymce.on('AddEditor', ({ editor }) => {
          if (!editor.id?.startsWith('rce-')) return;
          editor.on('init', () => console.log('%c[TINYMCE INIT] Editor klar:', 'color: green; font-weight: bold', editor.id));
        });
      }

      const sendObserver = new MutationObserver(() => {
        const k = document.querySelector('button[data-testid="submit-comment-button"]');
        if (k) { sendObserver.disconnect(); console.log('%c[SEND-KNAPP I DOM]', 'color: green; font-weight: bold', k); }
      });
      sendObserver.observe(document.body, { childList: true, subtree: true });

      console.log('%c[DEBUG] TinyMCE nå:', 'color: gray', typeof tinymce !== 'undefined' ? 'JA' : 'NEI');
      setTimeout(() => {
        observer.disconnect();
        sendObserver.disconnect();
        console.log('%c[DEBUG] Avsluttet etter 30 sek', 'color: purple; font-weight: bold');
      }, 30000);
    }
  });
}

// ─── HOVED-FUNKSJON ───────────────────────────────────────────────────────────
async function settInnKommentar() {
  // Hindre at flere samtidige innsettinger starter
  if (innsettingAktiv) return { feil: 'Innsetting pågår allerede' };
  innsettingAktiv = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.includes('speed_grader')) return { feil: 'Ikke Speed Grader' };

    // Hent elevinfo
    const infoResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        try {
          const navnEl = document.querySelector('[data-testid="selected-student"] span span');
          const fornavn = navnEl ? navnEl.innerText.trim().split(' ')[0] : null;
          const courseId = typeof ENV !== 'undefined' ? ENV.course_id : null;
          const userId = typeof ENV !== 'undefined' ? ENV.current_user_id : null;
          const urlParams = new URLSearchParams(window.location.search);
          const assignmentId = urlParams.get('assignment_id');
          const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
          const cookieToken = decodeURIComponent((document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]*)/) || [])[1] || '');
          const csrfToken = metaToken || cookieToken;
          return { fornavn, courseId, userId, assignmentId, csrfToken };
        } catch (e) { return null; }
      }
    });

    const info = infoResultat?.[0]?.result;
    if (!info?.fornavn) return { feil: 'Fant ikke elevnavn' };
    if (!info?.courseId) return { feil: 'Fant ikke course_id' };
    if (!info?.userId) return { feil: 'Fant ikke user_id' };

    // Hent kommentar fra API
    const apiResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (userId, courseId, assignmentId, csrfToken) => {
        try {
          const query = `query SpeedGrader_CommentBankItemQuery($userId: ID!, $first: Int, $courseId: ID, $assignmentId: ID) {
            legacyNode(_id: $userId, type: User) {
              ... on User {
                commentBankItemsConnection(first: $first, courseId: $courseId, assignmentId: $assignmentId) {
                  nodes { comment _id }
                }
              }
            }
          }`;
          const res = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ query, variables: { first: 5, userId, courseId, assignmentId },
              operationName: 'SpeedGrader_CommentBankItemQuery' })
          });
          if (!res.ok) return { feil: `HTTP ${res.status}` };
          const data = await res.json();
          const nodes = data?.data?.legacyNode?.commentBankItemsConnection?.nodes;
          if (!nodes || nodes.length === 0) return { feil: 'Ingen kommentarer funnet' };
          return { kommentar: nodes[0].comment };
        } catch (e) { return { feil: e.message }; }
      },
      args: [info.userId, info.courseId, info.assignmentId, info.csrfToken]
    });

    const resultat = apiResultat?.[0]?.result;
    if (!resultat?.kommentar) return { feil: resultat?.feil || 'Fant ingen kommentar' };

    // Vent til editor er klar, fokuser og sett inn – startes kun på brukers forespørsel
    const innSettingResultat = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (kommentar, fornavn) => {
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

            const medNavn = kommentar.replace(/@fornavn/gi, fornavn);
            const html = medNavn.split('\n').map(l => '<p>' + (l || '&nbsp;') + '</p>').join('');
            editor.setContent(html);
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
      args: [resultat.kommentar, info.fornavn]
    });

    const innSettingRes = innSettingResultat?.[0]?.result;
    if (!innSettingRes?.ok) return { feil: innSettingRes?.feil || 'Innsetting mislyktes' };
    return { ok: true };

  } finally {
    innsettingAktiv = false;
  }
}
