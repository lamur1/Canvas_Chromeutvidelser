document.getElementById('kjor').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Kjører...';
  status.className = '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('speed_grader')) {
    status.textContent = 'Åpne Speed Grader først.';
    status.className = 'feil';
    return;
  }

  // Send melding til background worker
  chrome.runtime.sendMessage({ action: 'kjor-godkjenn' }, (result) => {
    if (!result) {
      status.textContent = 'Noe gikk galt.';
      status.className = 'feil';
      return;
    }
    const deler = [];
    if (result.totalt > 0) deler.push(`${result.totalt} felt fyllt`);
    if (result.oppdatert) deler.push('Oppdater klikket');
    if (result.vurderingSatt) deler.push('Vurdering → Fullført');
    if (result.statusSatt) deler.push('Status → Ingen');

    if (deler.length > 0) {
      status.textContent = '✓ ' + deler.join(', ');
      status.className = 'ok';
    } else {
      status.textContent = 'Ingenting å gjøre.';
      status.className = 'feil';
    }
  });
});
