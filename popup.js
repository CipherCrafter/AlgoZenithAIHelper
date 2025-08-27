document.getElementById('save').addEventListener('click', async () => {
  const key = document.getElementById('key').value.trim();
  const msg = document.getElementById('msg');

  if (!key) {
    msg.textContent = 'Please enter a valid API key.';
    return;
  }

  try {
    const resp = await chrome.runtime.sendMessage({ type: 'ai-key:set', key });
    if (resp?.ok) {
      window.close(); // close the popup window
    } else {
      msg.textContent = resp?.error || 'Failed to save key.';
    }
  } catch (e) {
    msg.textContent = e.message || String(e);
  }
});