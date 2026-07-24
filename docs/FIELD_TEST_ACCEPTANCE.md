# Field-test release acceptance criteria

These criteria define when String Ledger is ready for its first small player field test. They intentionally focus on the existing local journal loop and do not add accounts, sync, push notifications, predictions, attachments, or a global string catalog.

## Core journal loop

- A player can create an instrument or bow profile and reach the relevant first-entry form without assistance.
- A player can record an initial full string setup and later replace either one string or a selected set.
- A player can record instrument maintenance, bow work, cost, provider, notes, and an optional reminder.
- Current strings and chronological history remain correct after partial replacements, archive/restore, and permitted event deletion.
- Repeat string entry minimizes retyping by offering the player's saved or previously entered setup details.

## Reminders and editing

- Every reminder identifies and links to its instrument or bow.
- Active, completed, and dismissed reminder states are understandable and usable without browser-native dialogs.
- Supported event fields can be edited in an accessible in-app form; protected string-history operations explain why they are unavailable.
- Destructive actions require explicit in-app confirmation and present recoverable errors in the interface.

## Data safety

- A player can export a versioned JSON backup containing every persisted record and relationship.
- A supported backup can be validated and restored into a fresh database without logical data loss.
- Invalid, corrupt, or unsupported backups are rejected before mutation and cannot partially overwrite the current journal.
- The interface explains that data belongs to the current browser profile and that clearing site data can remove it.

## Reliability and usability

- Loading, empty, missing-record, saving, and failure states provide a clear next action.
- Primary flows are keyboard-operable, have visible focus, associated labels and errors, adequate contrast, and usable touch targets.
- After one successful online load, the production build can be reopened and used offline without losing existing entries.
- A production service-worker update does not remove or corrupt journal data.
- Formatting, type-checking, linting, automated tests, and the production build pass in CI.

## Field-test evidence

For each session, record the device and browser, profile type, time and friction in the string-change flow, reminder comprehension, mistakes and recovery attempts, and whether backup export/restore succeeded. Collect this through observation or optional feedback rather than embedded behavioral analytics.
