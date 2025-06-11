const fs = require('fs');
const path = require('path');
const os = require('os');
const generateTest = require('./generateTestFile');
const generatePOM = require('./generatePOMFile');

// 1. Define paths
const downloadsFolder = path.join(os.homedir(), 'Downloads');
const outputPath = path.resolve(__dirname, '../output');

// 2. Log startup
console.log('👀 Watching for recordedActions*.json in:', downloadsFolder);

// 3. Start watcher
fs.watch(downloadsFolder, (eventType, filename) => {
  if (!filename || !filename.startsWith('recordedActions') || !filename.endsWith('.json')) return;

  console.log(`👀 watcher fired for ${filename}`);
  const fullPath = path.join(downloadsFolder, filename);

  // Add a small delay to ensure the file has been completely written
  setTimeout(() => {
    try {
      // 4. Read and parse file
      const rawData = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(rawData);

      const actions = parsed.actions;
      if (!Array.isArray(actions)) {
        throw new Error('Invalid format: "actions" must be an array');
      }

      console.log(`📄 Detected and parsing: ${filename}`);

      // 5. Generate POM and Test files
      generatePOM(actions, outputPath);
      generateTest(actions, outputPath);

      // 6. Move the processed JSON file to the output folder
      const archivePath = path.join(outputPath, filename);
      fs.renameSync(fullPath, archivePath);

      console.log(`✅ Generated test and POM. Moved JSON to: ${archivePath}`);
    } catch (err) {
      console.error(`❌ Error processing ${filename}: ${err.message}`);
    }
  }, 500); // Delay in ms
});
