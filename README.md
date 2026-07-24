# String Ledger

String Ledger is a mobile-first maintenance journal for string instruments and bows. It records current strings, partial or complete replacements, bow and instrument work, chronological history, usual string setups, archiving, and gentle in-app reminders.

## Technology

- Vite, React, TypeScript, and React Router
- Dexie over IndexedDB for all user data
- `vite-plugin-pwa` and Workbox for an offline application shell
- Vitest, fake IndexedDB, and React Testing Library support
- ESLint with TypeScript and React Hooks rules

## Run locally

Requires a current Node.js LTS release.

```bash
npm ci
npm run dev
```

The development-only **Load clearly marked demo data** button creates the requested cello, mixed Larsen/Spirocore setup, bow, rehair, and reminder. It is shown only when the database is empty and is excluded from production behavior.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## Local storage and offline behavior

Each mutation is written to the browser's IndexedDB database through Dexie. String replacement uses a transaction so closing the former installation and adding its replacement succeed together. No data leaves the device. The production service worker caches the application shell after initial load; entries remain usable through refresh, browser restart, and offline sessions. Clearing site data or using a different browser/profile removes or isolates the journal.

## Backup and restore

Open **Backup** in the application to download a versioned JSON copy of every journal record. Restore validates the complete file and its relationships before replacing the current journal in one transaction. Invalid or unsupported files leave existing data unchanged. Restore intentionally replaces rather than merges journals; download the current journal first if it may be needed later.

## Known limitations

- No cloud backup, cross-device sync, or accounts
- Reminders appear in the app only; there are no push notifications
- Usual setup is intentionally one preset per instrument
- String-change dates are protected from direct editing, and changes with later replacements cannot be deleted
- Bow reminder intervals are entered as explicit dates in this first slice
- Profile metadata editing, photos, and custom currency formatting are limited

## Sensible future extensions

The next product task is field-testing the end-to-end logging and backup loops with players, then improving profile/event editing and reducing repeated string-entry work. Only after validating those workflows should optional encrypted sync or notification delivery be considered. See [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md) for the scope rationale.
