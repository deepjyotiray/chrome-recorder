const crypto = require('crypto');

/**
 * Generate a method name based on XPath using best-effort readability
 * Prioritizes ID, visible text, and label fallback
 */
function getMethodNameFromXPath(xpath) {
  // Try to extract from ID
  const idMatch = xpath.match(/@id\s*=\s*["']([^"']+)["']/);
  if (idMatch) {
    return `xpath${idMatch[1].replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  // Try to extract from text()
  const textMatch = xpath.match(/text\(\)\s*=\s*["']([^"']+)["']/);
  if (textMatch) {
    return `xpath${textMatch[1].replace(/\s+/g, '')}`;
  }

  // Try to extract from placeholder or aria-label
  const placeholderMatch = xpath.match(/@placeholder\s*=\s*["']([^"']+)["']/);
  if (placeholderMatch) {
    return `xpath${placeholderMatch[1].replace(/\s+/g, '')}Input`;
  }

  const ariaMatch = xpath.match(/@aria-label\s*=\s*["']([^"']+)["']/);
  if (ariaMatch) {
    return `xpath${ariaMatch[1].replace(/\s+/g, '')}`;
  }

  // Fallback: Tag + short hash
  const tagMatch = xpath.match(/^\/\/(\w+)/);
  const tag = tagMatch ? tagMatch[1] : 'element';
  const hash = crypto.createHash('md5').update(xpath).digest('hex').slice(0, 6);
  return `xpath${capitalize(tag)}${hash}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Clean up XPath string for embedding in test code
 */
function cleanXPath(xpath) {
  return xpath.replace(/"/g, `'`);
}

module.exports = {
  getMethodNameFromXPath,
  cleanXPath
};
