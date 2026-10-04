const { _electron: electron } = require('playwright-core');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

async function withApp(callback, options = {}) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'qobuz-test-'));
  let app;
  try {
    app = await electron.launch({
      args: [path.join(__dirname, 'window-controls-fixture.cjs')],
      env: { ...process.env, QOBUZ_DEBUG: '0', QOBUZ_TEST_PROFILE: profile, ...options },
      timeout: 15000,
    });
    await callback(app, await app.firstWindow());
  } finally {
    try {
      if (app) await app.close();
    } finally {
      await fs.rm(profile, { recursive: true, force: true });
    }
  }
}
module.exports = { withApp };
