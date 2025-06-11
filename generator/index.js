const fs = require('fs');
const path = require('path');
const generateTest = require('./generateTestFile');
const generatePOM = require('./generatePOMFile');

const dataPath = path.resolve(__dirname, 'recordedActions.json');
const outputPath = path.resolve(__dirname, '../output');

if (!fs.existsSync(dataPath)) {
  console.error('❌ No recordedActions.json found!');
  process.exit(1);
}

const actions = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

generatePOM(actions, outputPath);
generateTest(actions, outputPath);
