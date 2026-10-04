const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers.cjs');

test('system window controls do not overlay the unmodified Qobuz page', async () => {
  await withApp(async (_app, page) => {
    await page.locator('.NavBar').waitFor();
    assert.equal(await page.evaluate(() => navigator.windowControlsOverlay.visible), false);
    const state = await page.evaluate(() => ({
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      navigationDisplay: getComputedStyle(document.querySelector('.NavBar')).display,
    }));
    assert.deepEqual(state, { htmlClasses: '', bodyClasses: '', navigationDisplay: 'block' });
  });
});
