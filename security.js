const APP_ORIGIN = 'https://play.qobuz.com';
const TRUSTED_ORIGINS = new Set([APP_ORIGIN, 'https://www.qobuz.com', 'https://qobuz.com']);

function parseWebURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function isTrustedURL(value) {
  const url = parseWebURL(value);
  return Boolean(url && TRUSTED_ORIGINS.has(url.origin));
}

function configureSession(session) {
  session.setPermissionCheckHandler(() => false);
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
}

function protectNavigation(contents, openExternal) {
  contents.on('will-navigate', (event, value) => {
    const url = event.url || value;
    if (isTrustedURL(url)) return;
    event.preventDefault();
    // A normal HTTPS link opens in the user's browser, without our session.
    if (parseWebURL(url) && isTrustedURL(contents.getURL())) {
      openExternal(url).catch(() => console.error('Could not open external link.'));
    }
  });
  contents.on('will-redirect', (event, value) => {
    if (!isTrustedURL(event.url || value)) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (isTrustedURL(contents.getURL()) && parseWebURL(url)) {
      openExternal(url).catch(() => console.error('Could not open external link.'));
    }
    return { action: 'deny' };
  });
}

module.exports = { APP_ORIGIN, isTrustedURL, parseWebURL, configureSession, protectNavigation };
