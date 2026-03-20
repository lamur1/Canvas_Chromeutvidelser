// Keepalive: kjøres hver gang service workeren starter
chrome.alarms.getAll((alarms) => {
  if (!alarms.find(a => a.name === 'keepalive')) {
    chrome.alarms.create('keepalive', { periodInMinutes: 1/3 }); // hvert 20. sek
  }
});

chrome.alarms.onAlarm.addListener(() => {
  // Bare å lytte holder workeren våken
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'start-opptak') await toggleOpptak();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle-opptak') {
    toggleOpptak().then(sendResponse);
    return true;
  }
  if (message.action === 'hent-status') {
    hentStatus().then(sendResponse);
    return true;
  }
});

async function finnSpeedGraderTab() {
  // Prioriter alltid aktiv fane i fokusert vindu
  const [aktivFane] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (aktivFane?.url?.includes('speed_grader')) return aktivFane;

  // Fallback: søk etter Speed Grader blant alle faner,
  // men foretrekk faner i fokusert vindu
  const alle = await chrome.tabs.query({});
  const iFokusertVindu = alle.find(t =>
    t.url?.includes('speed_grader') && t.windowId === aktivFane?.windowId
  );
  if (iFokusertVindu) return iFokusertVindu;

  // Siste utvei: hvilken som helst Speed Grader-fane
  return alle.find(t => t.url?.includes('speed_grader')) ?? null;
}

async function hentStatus() {
  const tab = await finnSpeedGraderTab();
  if (!tab) return { opptakAktivt: false };

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => !!document.querySelector('#screen_capture_finish_button')
  });

  return { opptakAktivt: results.some(r => r.result === true) };
}

async function toggleOpptak() {
  const tab = await finnSpeedGraderTab();
  if (!tab) return { feil: 'Fant ikke Speed Grader-fane' };

  const statusResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => !!document.querySelector('#screen_capture_finish_button')
  });

  const opptakPagar = statusResults.some(r => r.result === true);

  if (opptakPagar) {
    return await stopOpptak(tab);
  } else {
    return await startOpptak(tab);
  }
}

async function startOpptak(tab) {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      const btn = document.querySelector('[data-testid="media_comment_button"]');
      if (btn) btn.click();
    }
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      return new Promise(resolve => {
        const startBtn = document.querySelector('#screen_capture_start_button');
        if (startBtn) {
          setTimeout(() => { startBtn.click(); resolve(true); }, 300);
          return;
        }
        const observer = new MutationObserver(() => {
          const btn = document.querySelector('#screen_capture_start_button');
          if (btn) {
            observer.disconnect();
            setTimeout(() => { btn.click(); resolve(true); }, 300);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(false); }, 5000);
      });
    }
  });

  if (results.some(r => r.result === true)) {
    return { ok: true, opptakAktivt: true };
  } else {
    return { feil: 'Kunne ikke starte opptak' };
  }
}

async function stopOpptak(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      const btn = document.querySelector('#screen_capture_finish_button');
      if (btn) { btn.click(); return true; }
      return false;
    }
  });

  if (results.some(r => r.result === true)) {
    await chrome.windows.update(tab.windowId, { focused: true });
    return { ok: true, opptakAktivt: false };
  } else {
    return { feil: 'Stoppknapp ikke funnet' };
  }
}
