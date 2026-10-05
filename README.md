# Qobuz Compact Client

An unofficial Linux desktop wrapper for Qobuz’s web player, with a compact dark theme.
The local `theme.css` is reapplied whenever the player loads. Search filters keep
their original actions, with rounded pills, a larger close target, and dark scrollbars.
Not affiliated with Qobuz.

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
