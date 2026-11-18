# Architecture

The extension uses Vite with CRXJS, React for extension pages, Dexie over IndexedDB for durable data, Zod for runtime validation, and a typed message boundary between extension contexts. The service worker never relies on module-level runtime state and recreates alarms from persisted item state.

Future phases add extraction adapters, offscreen parsing, alert evaluation, and the dashboard without changing these boundaries.
