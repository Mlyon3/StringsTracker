# Product decisions

## Local-first by design

This prototype keeps profiles, maintenance events, string installations, reminders, and usual setups in IndexedDB. It offers immediate entry, offline access after the application shell is cached, and privacy without requiring an account. Cloud sync and conflict resolution would add substantial product and operational complexity before the journal loop is validated.

## Strings are installations, not notes

A string has a lifecycle: it occupies one position, is installed on a date, and may later be removed. Separate installation records make mixed sets, string age, partial replacements, and complete history queryable. A maintenance event groups the human action while installation rows describe its effect on the instrument.

## Deriving the current setup

The current setup is the installation without a `removedDate` for each position. Logging a replacement closes every active installation in that position inside the same IndexedDB transaction, then adds the replacement. Old rows remain available for history.

## Conservative editing and deletion

Ordinary event metadata can be edited. A string-change date cannot be moved because that could reorder installation lifecycles; users must delete and re-log it. A latest string-change event may be deleted: its installations are removed and immediately preceding strings closed by that event are reactivated. A string change with later replacements is protected from deletion. These rules favor an explicit error over silently corrupting current state.

## Deliberately postponed

The prototype does not include accounts, cloud sync, sharing, attachments, notifications, catalogs, analytics, calendar integrations, or predictions. Reminder intervals are represented as a chosen future date. Image capture and richer profile editing are also deferred until the core logging behavior has been tested with players.
