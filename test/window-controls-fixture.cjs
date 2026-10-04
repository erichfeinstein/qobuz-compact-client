const { app, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

app.setPath('appData', process.env.QOBUZ_TEST_PROFILE);
const page = fs.readFileSync(path.join(__dirname, 'window-controls-fixture.html'), 'utf8');
global.testRequests = [];
global.testExternalLinks = [];
global.testOffline = process.env.QOBUZ_TEST_OFFLINE === '1';
shell.openExternal = async url => { global.testExternalLinks.push(url); };
// Keep the real startup and HTTPS origin, but never contact Qobuz.
app.whenReady().then(() => {
  session.fromPartition('persist:qobuz-compact').protocol.handle('https', request => {
    global.testRequests.push(request.url);
    return global.testOffline ? Response.error() : new Response(page, {
      headers: { 'content-type': 'text/html' },
    });
  });
});
require('../main.js');
