# Permission justifications

- `storage`: settings and ephemeral browser state.
- `alarms`: durable periodic check scheduling without service-worker timers.
- `notifications`: user-requested price alerts.
- `activeTab` and `scripting`: extraction only after a user action on the current tab.
- `contextMenus`: explicit tracking entry points.
- `sidePanel`: dashboard entry point.
- `offscreen`: DOM parsing where a service worker has no DOM.
- `unlimitedStorage`: bounded local price histories and user exports.
- Optional `https://*/*`: requested per domain when the user chooses to track that site; it is not granted at install.
