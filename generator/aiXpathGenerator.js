/*
 * aiXpathGenerator.js
 *
 * Usage:
 *   node aiXpathGenerator.js <page-url>
 *
 * This script launches a headless browser, navigates to the given URL,
 * extracts all interactive elements (buttons, links, form controls),
 * and then uses OpenAI to generate human-friendly names and robust XPaths
 * for each element based on their text, labels, and attributes.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { Configuration, OpenAIApi } = require('openai');

// Ensure API key is provided via env var
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Set OPENAI_API_KEY in your environment.');
  process.exit(1);
}

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node aiXpathGenerator.js <page-url>');
    process.exit(1);
  }

  // 1. Launch headless browser and navigate
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 2. Extract interactive elements from the DOM
  const elements = await page.evaluate(() => {
    const selector = [
      'button',
      'a[href]',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      'select',
      'textarea'
    ].join(',');
    const nodes = Array.from(document.querySelectorAll(selector));

    // Fallback XPath builder
    function getBasicXPath(el) {
      const parts = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let idx = 1;
        let sib = el.previousSibling;
        while (sib) {
          if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) idx++;
          sib = sib.previousSibling;
        }
        parts.unshift(`${el.nodeName.toLowerCase()}[${idx}]`);
        el = el.parentNode;
      }
      return '/' + parts.join('/');
    }

    return nodes.map(el => {
      return {
        text: el.innerText.trim() || el.value || '',
        tag: el.tagName.toLowerCase(),
        attrs: {
          id: el.id || '',
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          'aria-label': el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || ''
        },
        basicXPath: getBasicXPath(el)
      };
    });
  });

  await browser.close();

  // 3. Build an OpenAI prompt
  const prompt = `You are an AI that helps generate human-readable XPath selectors for UI elements. Given the page URL: ${url} and a list of elements:

${JSON.stringify(elements, null, 2)}

Generate a JSON array of objects, each with:
- name: a concise, PascalCase variable describing the element (e.g. SaveButton, UserNameInput).
- xpath: a robust XPath using text(), @id, @name, normalize-space(), or other attributes to uniquely locate the element.`;

  // 4. Call OpenAI
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You generate XPath selectors.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 2000
  });

  const aiContent = response.data.choices[0].message.content;

  // 5. Save AI output to file
  const outPath = path.resolve(__dirname, 'aiXpaths.json');
  fs.writeFileSync(outPath, aiContent, 'utf-8');
  console.log(`✅ AI-generated XPaths saved to ${outPath}`);
})();
