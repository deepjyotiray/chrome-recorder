document.getElementById('startBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => window.dispatchEvent(new Event('start-recording'))
    });
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => window.dispatchEvent(new Event('stop-recording'))
    });
  });
});

// ✅ Button: Clear POM/Test files (uses background script)
document.getElementById('clearFilesBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'clear-generated-files' }, response => {
    alert(response.success ? 'Files deleted.' : `Error: ${response.error}`);
  });
});

// ✅ Button: Show extension storage
document.getElementById('showStorageBtn').addEventListener('click', () => {
  chrome.storage.local.get(null, data => {
    document.getElementById('storageView').textContent = JSON.stringify(data, null, 2);
  });
});

// ✅ Button: Clear extension storage
document.getElementById('clearStorageBtn').addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    alert('Chrome extension storage cleared.');
    document.getElementById('storageView').textContent = '';
  });
});
