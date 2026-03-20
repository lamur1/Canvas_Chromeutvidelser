const knapp = document.getElementById('kjor');
const status = document.getElementById('status');

// Hent gjeldende opptaksstatus når popup åpnes
chrome.runtime.sendMessage({ action: 'hent-status' }, (res) => {
  oppdaterKnapp(res?.opptakAktivt ?? false);
});

function oppdaterKnapp(opptakAktivt) {
  if (opptakAktivt) {
    knapp.textContent = '⏹ Stopp opptak';
    knapp.classList.add('stopp');
  } else {
    knapp.textContent = '▶ Start opptak';
    knapp.classList.remove('stopp');
  }
}

knapp.addEventListener('click', async () => {
  status.textContent = 'Jobber...';
  status.className = '';
  knapp.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('speed_grader')) {
    status.textContent = 'Åpne Speed Grader først.';
    status.className = 'feil';
    knapp.disabled = false;
    return;
  }

  chrome.runtime.sendMessage({ action: 'toggle-opptak' }, (result) => {
    knapp.disabled = false;

    if (result?.feil) {
      status.textContent = result.feil;
      status.className = 'feil';
      // Oppdater knapp basert på faktisk tilstand
      oppdaterKnapp(result.opptakAktivt ?? false);
      return;
    }

    if (result?.ok) {
      if (result.opptakAktivt) {
        status.textContent = '✓ Opptak startet!';
        status.className = 'ok';
      } else {
        status.textContent = '✓ Opptak stoppet.';
        status.className = 'ok';
      }
      oppdaterKnapp(result.opptakAktivt);
    } else {
      status.textContent = 'Noe gikk galt.';
      status.className = 'feil';
    }
  });
});
