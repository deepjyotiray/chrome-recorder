const OPENAI_KEY = 'sk-...'; // Replace with your actual key

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'ai-name-actions') {
    aiNameActions(req.actions)
        .then(enriched => sendResponse({ success: true, actions: enriched }))
        .catch(err => {
          console.error('AI naming failed (batch):', err);
          sendResponse({ success: false, error: err.message });
        });
    return true;
  }

  if (req.type === 'generate-ai-name') {
    aiSingleName(req)
        .then(name => sendResponse({ success: true, name }))
        .catch(err => {
          console.error('AI naming failed (single):', err);
          sendResponse({ success: false, error: err.message });
        });
    return true;
  }
});

async function aiSingleName({ xpath, tag, domContext }) {
  const prompt = `
You are an expert UI tester. Given a DOM element described below, return a single JavaScript-safe human-readable name (like 'saveButton' or 'usernameInput') that reflects its purpose.

Use the following:
- XPath: "${xpath}"
- Tag: ${tag}
- Nearby DOM (trimmed): """${domContext}"""

Only return the name as a string in JSON format:
{
  "name": "yourGeneratedNameHere"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You return only valid JSON with a name field.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 100
    })
  });

  const json = await response.json();

  let text = json.choices?.[0]?.message?.content?.trim() || '';
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.name === 'string') {
      return sanitizeName(parsed.name);
    }
  } catch (err) {
    throw new Error('Invalid JSON returned from OpenAI');
  }

  throw new Error('Name could not be parsed from response');
}

async function aiNameActions(actions) {
  const prompt = `
You are an AI that improves selector names. Take this array of recorded user actions and return a new array with the same format but with better human-readable names (e.g., "saveButton", "usernameInput").

Return valid JSON only:
[
  { "type": "...", "xpath": "...", "name": "..." },
  ...
]

Input:
${JSON.stringify(actions.slice(0, 30), null, 2)}
`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Only return valid JSON with "xpath", "type", "name" fields.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  const body = await resp.json();

  let text = body.choices?.[0]?.message?.content?.trim() || '';
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Expected array in OpenAI response');

  return parsed.map(item => ({
    xpath: item.xpath,
    type: item.type,
    name: sanitizeName(item.name),
    value: item.value,
    pageUrl: item.pageUrl
  }));
}

function sanitizeName(name) {
  return name
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/^(\d)/, '_$1');
}
