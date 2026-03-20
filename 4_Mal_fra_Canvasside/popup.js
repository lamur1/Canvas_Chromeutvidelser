chrome.storage.local.get('malUrl', (data) => {
  if (data.malUrl) {
    document.getElementById('url').value = data.malUrl;
    document.getElementById('url-status').innerHTML = '✓ URL lagret';
    document.getElementById('url-status').style.color = 'green';
  }
});

document.getElementById('lagre').addEventListener('click', () => {
  const url = document.getElementById('url').value.trim();
  const urlStatus = document.getElementById('url-status');
  if (!url) {
    urlStatus.style.color = 'orange';
    urlStatus.textContent = '⚠ Lim inn en URL først.';
    return;
  }
  chrome.storage.local.set({ malUrl: url }, () => {
    urlStatus.style.color = 'green';
    urlStatus.textContent = '✓ URL lagret!';
  });
});

document.getElementById('btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Henter mal...';
  const result = await chrome.runtime.sendMessage({ action: 'sett-inn-mal' });
  statusEl.textContent = result?.ok ? '✓ Mal satt inn!' : ('⚠ ' + (result?.feil || 'Ukjent feil'));
});
