document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const toggle = document.getElementById('frameworkToggle');
  const label = document.getElementById('frameworkLabel');
  const badge = document.getElementById('recordingBadge');
  const toggleModeBtn = document.getElementById('toggleModeBtn');
  const popupBody = document.getElementById('popupBody');

  // 🔄 Sync initial state
  chrome.storage.local.get(['framework', 'isRecording', 'minimized'], data => {
    toggle.checked = (data.framework === 'selenium');
    label.textContent = toggle.checked ? 'Selenium' : 'Cypress';

    const recording = data.isRecording || false;
    startBtn.disabled = recording;
    stopBtn.disabled = !recording;
    badge.style.display = recording ? 'block' : 'none';

    // Minimized UI
    popupBody.classList.toggle('minimized', data.minimized);
    toggleModeBtn.textContent = data.minimized ? 'Expand UI' : 'Minimize UI';
  });

  // ▶ Start Recording
  startBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.dispatchEvent(new Event('start-recording'))
      });
    });

    chrome.storage.local.set({ isRecording: true });
    startBtn.disabled = true;
    stopBtn.disabled = false;
    badge.style.display = 'block';
  });

  // ⏹ Stop Recording
  stopBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.dispatchEvent(new Event('stop-recording'))
      });
    });

    chrome.storage.local.set({ isRecording: false });
    startBtn.disabled = false;
    stopBtn.disabled = true;
    badge.style.display = 'none';
  });

  // 🔁 Toggle Framework
  toggle.addEventListener('change', () => {
    const selectedFramework = toggle.checked ? 'selenium' : 'cypress';
    chrome.storage.local.set({ framework: selectedFramework });
    label.textContent = selectedFramework.charAt(0).toUpperCase() + selectedFramework.slice(1);
    console.log(`[Recorder] Switched to: ${selectedFramework}`);
  });

  // 🧹 Clear Generated Files
  document.getElementById('clearFilesBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'clear-generated-files' }, response => {
      alert(response.success ? 'Files deleted.' : `Error: ${response.error}`);
    });
  });

  // 📂 Show Storage
  document.getElementById('showStorageBtn').addEventListener('click', () => {
    chrome.storage.local.get(null, data => {
      document.getElementById('storageView').textContent = JSON.stringify(data, null, 2);
    });
  });

  // ❌ Clear Storage
  document.getElementById('clearStorageBtn').addEventListener('click', () => {
    chrome.storage.local.clear(() => {
      alert('Chrome extension storage cleared.');
      document.getElementById('storageView').textContent = '';
      chrome.storage.local.set({ framework: 'cypress', isRecording: false });
      toggle.checked = false;
      label.textContent = 'Cypress';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      badge.style.display = 'none';
    });
  });

  // 🪄 Toggle Minimized UI
  toggleModeBtn.addEventListener('click', () => {
    const isNowMinimized = popupBody.classList.toggle('minimized');
    toggleModeBtn.textContent = isNowMinimized ? 'Expand UI' : 'Minimize UI';
    chrome.storage.local.set({ minimized: isNowMinimized });
  });
});
