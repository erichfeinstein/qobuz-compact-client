const { app, BrowserWindow } = require('electron');
app.setPath('appData', require('node:fs').mkdtempSync('/tmp/qobuz-controls-'));
// Keep the test debug endpoint separate from the running desktop app.
const appendSwitch = app.commandLine.appendSwitch.bind(app.commandLine);
app.commandLine.appendSwitch = (name, value) => appendSwitch(name, name === 'remote-debugging-port' ? '0' : value);
BrowserWindow.prototype.loadURL = function () {
  return this.loadFile(__dirname + '/window-controls-fixture.html');
};
require('../main.js');
