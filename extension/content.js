let actions = [];
let visitedUrls = new Set();
let inputDebounce = {};

// 🔄  Re-hydrate state whenever this script loads
chrome.storage.local.get(['recordedActions', 'visitedPages'], data => {
  actions = data.recordedActions || [];
  (data.visitedPages || []).forEach(url => visitedUrls.add(url));
  visitedUrls.add(location.href);
  chrome.storage.local.set({ visitedPages: [...visitedUrls] });
});

window.addEventListener('popstate', trackPage);
window.addEventListener('hashchange', trackPage);

function trackPage() {
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
    const last = [...actions].reverse().find(a => a.type === 'input' && a.xpath === xpath);
    if (!last || last.value !== value) {
      actions.push({ type: 'input', xpath, name, value, pageUrl });
      chrome.storage.local.set({ recordedActions: actions, visitedPages: Array.from(visitedUrls) });
    }
  }, 300);
}

// ✅ Record click events with AI fallback
function recordClick(e) {
  const el = e.target;
  const xpath = getXPath(el);
  const pageUrl = location.href;
  const domContext = getDOMContext(el);

  chrome.runtime.sendMessage({ type: 'generate-ai-name', xpath, tag: el.tagName, domContext }, (response) => {
    const name = response?.name || generateName(el);
    actions.push({ type: 'click', xpath, name, pageUrl });
    chrome.storage.local.set({ recordedActions: actions, visitedPages: Array.from(visitedUrls) });
  });
}

// ✅ DOM Context for AI naming
function getDOMContext(el) {
  const container = document.createElement('div');
  const parent = el.closest('form') || el.closest('section') || el.parentNode;
  if (!parent) return '';
  container.innerHTML = parent.innerHTML;
  return container.innerText.trim().slice(0, 1000);
}

// ✅ Start and Stop Recording
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

  chrome.runtime.sendMessage({ type: 'ai-name-actions', actions }, (response) => {
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

// ✅ File Download
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

// ✅ Human-readable Name Generator
function toPascalCase(str) {
  return str
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .replace(/\s(.)/g, s => s.toUpperCase())
      .replace(/\s+/g, '')
      .replace(/^(.)/, s => s.toUpperCase());
}

function generateName(el) {
  const tag = el.tagName?.toLowerCase();

  // 1. Use visible text
  const text = el.innerText?.trim();
  if (text && text.length > 0 && text.length < 100) {
    return `xpath${toPascalCase(text)}${tag === 'button' ? 'Button' : ''}`;
  }

  // 2. Placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) {
    return `xpath${toPascalCase(placeholder)}Input`;
  }

  // 3. aria-label
  const aria = el.getAttribute('aria-label');
  if (aria) {
    return `xpath${toPascalCase(aria)}`;
  }

  // 4. title
  const title = el.getAttribute('title');
  if (title) {
    return `xpath${toPascalCase(title)}`;
  }

  // 5. label for= or parent <label>
  const label = getLabelText(el);
  if (label) {
    return `xpath${toPascalCase(label)}${tag === 'input' ? 'Input' : ''}`;
  }

  // 6. Fallback to ID or random
  const fallback = el.id || el.name || Math.random().toString(16).slice(2, 8);
  return `xpathGenerated${toPascalCase(fallback)}`;
}


// ✅ Text-based XPath Generator
function getXPath(element) {
  if (!element) return '';

  const tag = element.tagName.toLowerCase();
  const text = element.innerText?.trim();

  // Direct visible text match
  if (text && text.length < 50) {
    return `//${tag}[normalize-space(text())="${text}"]`;
  }

  // Use attributes
  const attrXPath = tryAttributeXPath(element);
  if (attrXPath) return attrXPath;

  // ⬆️ Search up 2 levels for anchor with text
  let current = element;
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

  // Fallback
  return generateFallbackXPath(element);
}

function tryAttributeXPath(element) {
  const tag = element.tagName.toLowerCase();

  if (element.getAttribute('placeholder')) {
    return `//${tag}[@placeholder="${element.getAttribute('placeholder')}"]`;
  }

  if (element.getAttribute('aria-label')) {
    return `//${tag}[@aria-label="${element.getAttribute('aria-label')}"]`;
  }

  if (element.getAttribute('title')) {
    return `//${tag}[@title="${element.getAttribute('title')}"]`;
  }

  if (element.getAttribute('id')) {
    return `//*[@id="${element.id}"]`;
  }

  return null;
}


// ✅ Label extractor
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

// ✅ Fallback XPath
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

// ✅ Expose
window.addEventListener('start-recording', startRecording);
window.addEventListener('stop-recording', stopRecording);
