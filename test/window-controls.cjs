const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const app = await electron.launch({args: [__dirname + '/window-controls-fixture.cjs']});
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState();
    await page.waitForFunction(() => {
      const nav = document.querySelector('.NavBar');
      return nav && nav.getBoundingClientRect().right <= navigator.windowControlsOverlay.getTitlebarAreaRect().right;
    });
    const state = await page.evaluate(() => ({
      visible: navigator.windowControlsOverlay?.visible ?? false,
      rect: navigator.windowControlsOverlay?.getTitlebarAreaRect().toJSON(),
    }));
    console.log(JSON.stringify(state));
    assert.equal(state.visible, true, 'Native window controls must be visible');
    assert.ok(state.rect.width < 1180, 'Window controls must occupy reserved space');
  } finally { await app.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
