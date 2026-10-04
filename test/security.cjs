const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers.cjs');

test('normal startup keeps isolation and does not expose port 9223', async () => {
  await withApp(async app => {
    const state = await app.evaluate(({ app, BrowserWindow, globalShortcut }) => {
      const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: prefs.sandbox, isolation: prefs.contextIsolation, node: prefs.nodeIntegration,
        port: app.commandLine.getSwitchValue('remote-debugging-port'), profile: app.getPath('userData'),
        globalReload: globalShortcut.isRegistered('CommandOrControl+Shift+R') };
    });
    assert.deepEqual([state.sandbox, state.isolation, state.node], [true, true, false]);
    assert.notEqual(state.port, '9223');
    assert.equal(state.globalReload, false);
    assert.ok(state.profile.endsWith('qobuz-compact-client'));
  });
});

test('remote pages cannot create windows or navigate to non-web schemes', async () => {
  await withApp(async (app, page) => {
    await page.waitForURL('https://play.qobuz.com/');
    await page.evaluate(() => window.open('about:blank', 'blocked-popup'));
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    await page.evaluate(() => { window.location.href = 'file:///etc/passwd'; });
    assert.equal(page.url(), 'https://play.qobuz.com/');
    assert.deepEqual(await app.evaluate(() => global.testExternalLinks), []);
  });
});

test('external HTTPS links leave the app without sharing its session', async () => {
  await withApp(async (app, page) => {
    await page.waitForURL('https://play.qobuz.com/');
    await page.evaluate(() => { const a = document.createElement('a'); a.href = 'https://example.org/music'; document.body.append(a); a.click(); });
    await page.waitForFunction(() => document.readyState === 'complete');
    assert.equal(page.url(), 'https://play.qobuz.com/');
    assert.deepEqual(await app.evaluate(() => global.testExternalLinks), ['https://example.org/music']);
  });
});

test('notification permission is denied for remote content', async () => {
  await withApp(async (_app, page) => {
    await page.waitForURL('https://play.qobuz.com/');
    assert.equal(await page.evaluate(() => Notification.requestPermission()), 'denied');
  });
});

test('failed loading displays a retry page that can recover', async () => {
  await withApp(async (app, page) => {
    await page.getByRole('heading', { name: 'Couldn’t load Qobuz' }).waitFor();
    await app.evaluate(() => { global.testOffline = false; });
    await page.getByRole('link', { name: 'Try again' }).click();
    await page.waitForURL('https://play.qobuz.com/');
    await page.locator('.NavBar').waitFor();
  }, { QOBUZ_TEST_OFFLINE: '1' });
});

test('reload shortcut retries the player instead of reloading the error page', async () => {
  await withApp(async (app, page) => {
    await page.getByRole('heading', { name: 'Couldn’t load Qobuz' }).waitFor();
    await app.evaluate(() => { global.testOffline = false; });
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.focus();
      window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'R', modifiers: ['control', 'shift'] });
    });
    await page.waitForURL('https://play.qobuz.com/');
  }, { QOBUZ_TEST_OFFLINE: '1' });
});

test('a crashed error-page renderer is replaced with a usable retry page', async () => {
  await withApp(async (app, page) => {
    await page.getByRole('heading', { name: 'Couldn’t load Qobuz' }).waitFor();
    const title = await app.evaluate(({ BrowserWindow }) => new Promise((resolve, reject) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      const timeout = setTimeout(() => reject(new Error('Renderer did not recover')), 10000);
      contents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve(contents.getTitle());
      });
      contents.forcefullyCrashRenderer();
    }));
    assert.equal(title, 'Qobuz — connection problem');
    const recoveredURL = await app.evaluate(({ BrowserWindow }) => new Promise((resolve, reject) => {
      const window = BrowserWindow.getAllWindows()[0];
      global.testOffline = false;
      const timeout = setTimeout(() => reject(new Error('Retry did not recover')), 10000);
      window.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve(window.webContents.getURL());
      });
      window.focus();
      window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'R', modifiers: ['control', 'shift'] });
    }));
    assert.equal(recoveredURL, 'https://play.qobuz.com/');
  }, { QOBUZ_TEST_OFFLINE: '1' });
});
