const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { isTrustedURL, parseWebURL, protectNavigation, configureSession } = require('../security');

test('trusted origins reject lookalikes, credentials and non-HTTPS URLs', () => {
  for (const url of ['https://play.qobuz.com/library', 'https://www.qobuz.com/login', 'https://qobuz.com/']) {
    assert.equal(isTrustedURL(url), true);
  }
  for (const url of ['https://play.qobuz.com.evil.test/', 'https://evil.test/qobuz.com',
    'https://qobuz.com@evil.test/', 'https://user:secret@play.qobuz.com/',
    'http://play.qobuz.com/', 'file:///etc/passwd', 'javascript:alert(1)', 'not a URL']) {
    assert.equal(isTrustedURL(url), false, url);
  }
  assert.equal(parseWebURL('mailto:a@example.org'), null);
});

test('redirects cannot leave trusted origins or launch an external browser', () => {
  const contents = new EventEmitter();
  contents.getURL = () => 'https://play.qobuz.com/';
  contents.setWindowOpenHandler = handler => { contents.popup = handler; };
  const external = [];
  protectNavigation(contents, async url => { external.push(url); });
  let prevented = false;
  contents.emit('will-redirect', { url: 'https://evil.test/', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(external, []);
  prevented = false;
  contents.emit('will-redirect', { url: 'https://www.qobuz.com/login', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});

test('both permission paths deny capture and other unnecessary access', () => {
  let check, request;
  configureSession({ setPermissionCheckHandler(fn) { check = fn; }, setPermissionRequestHandler(fn) { request = fn; } });
  for (const permission of ['media', 'notifications', 'geolocation', 'clipboard-read', 'unknown']) {
    assert.equal(check(null, permission, 'https://play.qobuz.com'), false);
    let granted;
    request(null, permission, value => { granted = value; });
    assert.equal(granted, false);
  }
});
