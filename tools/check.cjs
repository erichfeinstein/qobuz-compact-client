const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

for (const directory of ['.', 'test', 'tools']) {
  for (const file of fs.readdirSync(directory)) {
    if (/\.(js|cjs)$/.test(file)) execFileSync(process.execPath, ['--check', path.join(directory, file)], { stdio: 'inherit' });
  }
}
