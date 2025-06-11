const fs = require('fs');
const path = require('path');
const { getMethodNameFromXPath, cleanXPath } = require('./utils');

/**
 * Generates a PageObjects.js file with human-readable and unique XPath entries.
 * It uses the 'name' field from recorded actions if available, falling back to a hash-based name.
 */
function generatePOM(actions, outputPath) {
  const methodMap = {};
  const nameCounts = {};

  actions.forEach(action => {
    // Prefer descriptive name from recording, else fallback to hashed name
    let baseName = action.name && action.name.trim()
      ? action.name.replace(/[^\w]/g, '')
      : getMethodNameFromXPath(action.xpath);

    // Ensure uniqueness by appending a counter if name repeats
    if (!nameCounts[baseName]) {
      nameCounts[baseName] = 0;
    } else {
      nameCounts[baseName] += 1;
    }
    const methodName = nameCounts[baseName] === 0
      ? baseName
      : `${baseName}_${nameCounts[baseName]}`;

    // Clean XPath for safe embedding
    const cleanedXPath = cleanXPath(action.xpath);

    // Only add unique entries
    if (!methodMap[methodName]) {
      methodMap[methodName] = cleanedXPath;
    }
  });

  // Build class content
  const classLines = Object.entries(methodMap).map(([name, xpath]) =>
    `  static ${name} = \`${xpath}\`;`
  );

  const content = `export default class PageObjects {
${classLines.join('\n')}
}
`;

  // Ensure output directory exists
  const dir = path.join(outputPath, 'pageObjects');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write file
  fs.writeFileSync(path.join(dir, 'PageObjects.js'), content, 'utf-8');
  console.log('✅ POM file generated at', path.join(dir, 'PageObjects.js'));
}

module.exports = generatePOM;
