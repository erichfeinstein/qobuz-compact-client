# Qobuz Compact Client

An unofficial Linux desktop wrapper for Qobuz’s standard web player.
It does not modify the player’s HTML or CSS. Not affiliated with Qobuz.

Requires Node.js 22+ and a Linux desktop. There are no packaged releases yet.

```sh
npm ci
npm start
```

Sign in through Qobuz. The app keeps its own browser profile, separate from Brave,
at `~/.config/qobuz-compact-client` (or your configured XDG config directory).
It does not collect credentials. Close the app before deleting that folder to
reset its session.

- `Ctrl+Shift+R`: reload or retry a failed connection
- `Ctrl+Shift+I`: developer tools
- `Alt+F4`: close

Navigation stays on the Qobuz player and website; other HTTPS links open in
your browser.
Third-party sign-in redirects are not supported yet.

Run `npm run check` and `npm test` to check the code. Tests use a fake page and
temporary profiles, not your account; headless Linux needs `xvfb-run -a npm test`.

Debugging is off by default. `QOBUZ_DEBUG=1 npm start` uses a separate profile
and enables the local inspector on port 9223. `npm run inspect` reports styles
without capturing screenshots. Close debug mode when finished.
