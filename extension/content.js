let actions = [];
let visitedUrls = new Set();
let inputDebounce = {};

// ✅ Rehydrate state on every page load
chrome.storage.local.get(['recordedActions', 'visitedPages'], data => {
  actions = data.recordedActions || [];
  visitedUrls = new Set(data.visitedPages || []);
  visitedUrls.add(location.href);

  console.log(`[Recorder] Page loaded: ${location.href}`);
  console.log(`[Recorder] Restored actions (${actions.length} total):`);
  actions.forEach((a, i) => console.log(`  [${i + 1}] ${a.type} - ${a.name} - ${a.xpath} - ${a.pageUrl}`));

  chrome.storage.local.set({
    visitedPages: Array.from(visitedUrls),
    recordedActions: actions
  });
});

// ✅ Track new URLs
window.addEventListener('popstate', saveCurrentPageInfo);
window.addEventListener('hashchange', saveCurrentPageInfo);
window.addEventListener('DOMContentLoaded', saveCurrentPageInfo);

function saveCurrentPageInfo() {
  visitedUrls.add(location.href);
  chrome.storage.local.set({ visitedPages: Array.from(visitedUrls) });
}

// ✅ Record input events with debounce
function recordInput(e) {
  const el = e.target;
  const xpath = getXPath(el);
  const name = generateName(el);
  const value = el.value;
  const pageUrl = location.href;

  clearTimeout(inputDebounce[xpath]);
  inputDebounce[xpath] = setTimeout(() => {
    const last = [...actions].reverse().find(a => a.type === 'input' && a.xpath === xpath && a.pageUrl === pageUrl);
    if (!last || last.value !== value) {
      const action = { type: 'input', xpath, name, value, pageUrl };
      actions.push(action);
      console.log(`[Recorder] Recorded input: ${name} - ${xpath}`);
      chrome.storage.local.set({ recordedActions: actions });
    }
  }, 300);
}

// ✅ Record click events
function recordClick(e) {
  const el = e.target;
  const xpath = getXPath(el);
  const pageUrl = location.href;
  const domContext = getDOMContext(el);

  chrome.runtime.sendMessage({ type: 'generate-ai-name', xpath, tag: el.tagName, domContext }, response => {
    const name = response?.name || generateName(el);
    const action = { type: 'click', xpath, name, pageUrl };
    actions.push(action);
    console.log(`[Recorder] Recorded click: ${name} - ${xpath}`);
    chrome.storage.local.set({ recordedActions: actions });
  });
}

// ✅ Get nearby context
function getDOMContext(el) {
  const container = document.createElement('div');
  const parent = el.closest('form') || el.closest('section') || el.parentNode;
  if (!parent) return '';
  container.innerHTML = parent.innerHTML;
  return container.innerText.trim().slice(0, 1000);
}

// ✅ Start/Stop logic
function startRecording() {
  console.log('[Recorder] Started');
  document.addEventListener('click', recordClick, true);
  document.addEventListener('input', recordInput, true);
}

function stopRecording() {
  console.log('[Recorder] Stopped');
  document.removeEventListener('click', recordClick, true);
  document.removeEventListener('input', recordInput, true);

  const testName = prompt("Enter a custom test name (optional):");

  chrome.runtime.sendMessage({ type: 'ai-name-actions', actions }, response => {
    const output = {
      actions: response?.success ? response.actions : actions,
      visitedPages: Array.from(visitedUrls),
      testName: testName?.trim() || null
    };

    downloadJSON(output, 'recordedActions.json');
    chrome.storage.local.remove(['recordedActions', 'visitedPages']);
    actions = [];
    visitedUrls.clear();
  });
}

// ✅ Download file
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ✅ Name generator
function toPascalCase(str) {
  return str
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .replace(/\s(.)/g, s => s.toUpperCase())
      .replace(/\s+/g, '')
      .replace(/^(.)/, s => s.toUpperCase());
}

function generateName(el) {
  const tag = el.tagName?.toLowerCase();
  const text = el.innerText?.trim();
  if (text && text.length < 100) {
    return `xpath${toPascalCase(text)}${tag === 'button' ? 'Button' : ''}`;
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return `xpath${toPascalCase(placeholder)}Input`;

  const aria = el.getAttribute('aria-label');
  if (aria) return `xpath${toPascalCase(aria)}`;

  const title = el.getAttribute('title');
  if (title) return `xpath${toPascalCase(title)}`;

  const label = getLabelText(el);
  if (label) return `xpath${toPascalCase(label)}${tag === 'input' ? 'Input' : ''}`;

  const fallback = el.id || el.name || Math.random().toString(16).slice(2, 8);
  return `xpathGenerated${toPascalCase(fallback)}`;
}

// ✅ XPath generator
function getXPath(el) {
  if (!el) return '';

  const tag = el.tagName.toLowerCase();
  const text = el.innerText?.trim();
  if (text && text.length < 50) return `//${tag}[normalize-space(text())="${text}"]`;

  const attrXPath = tryAttributeXPath(el);
  if (attrXPath) return attrXPath;

  let current = el;
  for (let i = 0; i < 2 && current.parentElement; i++) {
    current = current.parentElement;
    const anchor = [...current.children].find(child =>
        ['a', 'button', 'span', 'label', 'div'].includes(child.tagName.toLowerCase()) &&
        child.innerText?.trim()
    );
    if (anchor && anchor.innerText.trim().length < 50) {
      return `//${anchor.tagName.toLowerCase()}[normalize-space(text())="${anchor.innerText.trim()}"]`;
    }
  }

  return generateFallbackXPath(el);
}

function tryAttributeXPath(el) {
  const tag = el.tagName.toLowerCase();

  if (el.getAttribute('placeholder')) return `//${tag}[@placeholder="${el.getAttribute('placeholder')}"]`;
  if (el.getAttribute('aria-label')) return `//${tag}[@aria-label="${el.getAttribute('aria-label')}"]`;
  if (el.getAttribute('title')) return `//${tag}[@title="${el.getAttribute('title')}"]`;
  if (el.getAttribute('id')) return `//*[@id="${el.getAttribute('id')}"]`;

  return null;
}

function getLabelText(el) {
  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label && label.innerText.trim()) return label.innerText.trim();
  }
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.innerText.trim()) return parentLabel.innerText.trim();
  return '';
}

function generateFallbackXPath(el) {
  if (!el) return '';
  let path = '';
  while (el && el.nodeType === 1) {
    let index = 1;
    let sibling = el.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === el.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    path = `/${el.tagName.toLowerCase()}[${index}]${path}`;
    el = el.parentNode;
  }
  return path;
}

// ✅ Recording triggers
window.addEventListener('start-recording', startRecording);
window.addEventListener('stop-recording', stopRecording);
