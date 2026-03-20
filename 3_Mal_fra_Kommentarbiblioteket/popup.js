document.getElementById('kjor').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Setter inn...';
  status.className = '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('speed_grader')) {
    status.textContent = 'Åpne Speed Grader først.';
    status.className = 'feil';
    return;
  }

  chrome.runtime.sendMessage({ action: 'sett-inn-kommentar' }, (result) => {
    if (result && result.ok) {
      status.textContent = '✓ Kommentar satt inn!';
      status.className = 'ok';
    } else {
      status.textContent = result?.feil || 'Noe gikk galt.';
      status.className = 'feil';
    }
  });
});

document.getElementById('debug').addEventListener('click', async () => {
  const status = document.getElementById('status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('speed_grader')) {
    status.textContent = 'Åpne Speed Grader først.';
    status.className = 'feil';
    return;
  }

  status.textContent = '🔍 Logger til konsollen...';
  status.className = '';
  chrome.runtime.sendMessage({ action: 'start-debug' });
});
