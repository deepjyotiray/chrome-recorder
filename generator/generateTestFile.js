const fs = require('fs');
const path = require('path');
const { getMethodNameFromXPath } = require('./utils');

function generateTest(actions, outputPath, testName = null) {
  const groupedByUrl = {};
  actions.forEach(action => {
    const url = action.pageUrl || 'unknown';
    if (!groupedByUrl[url]) groupedByUrl[url] = [];
    groupedByUrl[url].push(action);
  });

  const testDir = path.join(outputPath, 'tests');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  Object.entries(groupedByUrl).forEach(([url, urlActions], index) => {
    const testLines = [
      `import PageObjects from '../pageObjects/PageObjects';`,
      ``,
      `describe('${testName || `Recorded Test for ${url}`}', () => {`,
      `  it('should replay user actions on ${url}', () => {`,
      `    cy.visit('${url}');`
    ];

    const finalActions = [];
    let currentInput = null;
    let currentInputName = null;

    for (let i = 0; i < urlActions.length; i++) {
      const action = urlActions[i];
      const id = action.name || getMethodNameFromXPath(action.xpath);

      if (action.type === 'input') {
        if (currentInputName === id) {
          currentInput = { ...action, name: id, index: i };
        } else {
          if (currentInput) finalActions.push(currentInput);
          currentInput = { ...action, name: id, index: i };
          currentInputName = id;
        }
      } else {
        if (currentInput) {
          finalActions.push(currentInput);
          currentInput = null;
          currentInputName = null;
        }

        if (action.type === 'click') {
          finalActions.push({ ...action, name: id, index: i });
        }
      }
    }

    if (currentInput) finalActions.push(currentInput);

    finalActions
        .sort((a, b) => a.index - b.index)
        .forEach(action => {
          if (action.type === 'click') {
            testLines.push(`    cy.xpath(PageObjects.${action.name}).click();`);
          }
          if (action.type === 'input') {
            testLines.push(`    cy.xpath(PageObjects.${action.name}).clear().type('${action.value}');`);
          }
        });

    testLines.push(`  });`, `});`);

    const safeName = (testName || `TestPage${index + 1}`).replace(/\s+/g, '_');
    const filePath = path.join(testDir, `${safeName}.cy.js`);
    fs.writeFileSync(filePath, testLines.join('\n'), 'utf-8');
    console.log(`✅ Test file created: ${safeName}.cy.js`);
  });
}

module.exports = generateTest;
