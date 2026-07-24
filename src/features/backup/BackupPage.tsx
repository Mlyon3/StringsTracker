import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { formatDate } from '../../lib/dates';
import {
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  type JournalBackup,
} from './backup';

function recordCount(backup: JournalBackup) {
  return Object.values(backup.data).reduce(
    (total, rows) => total + rows.length,
    0,
  );
}

export function BackupPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const counts = useLiveQuery(async () => ({
    assets: await db.assets.count(),
    events: await db.events.count(),
    installations: await db.installations.count(),
    reminders: await db.reminders.count(),
    usualSetups: await db.usualSetups.count(),
  }));
  const [candidate, setCandidate] = useState<JournalBackup>();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const download = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const backup = await createBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename(backup.exportedAt);
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded. Keep it somewhere you can find later.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The backup could not be created.',
      );
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (file?: File) => {
    setCandidate(undefined);
    setConfirmed(false);
    setMessage(undefined);
    setError(undefined);
    if (!file) return;
    try {
      setCandidate(parseBackup(await file.text()));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The backup could not be read.',
      );
    }
  };

  const replaceJournal = async () => {
    if (!candidate || !confirmed) return;
    setBusy(true);
    setError(undefined);
    try {
      await restoreBackup(candidate);
      setCandidate(undefined);
      setConfirmed(false);
      if (inputRef.current) inputRef.current.value = '';
      setMessage(
        'Backup restored. Your journal now contains the imported records.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Nothing was replaced. ${caught.message}`
          : 'Nothing was replaced. The backup could not be restored.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backup-page">
      <p className="eyebrow">Your data</p>
      <h1>Backup &amp; restore</h1>
      <p className="page-intro">
        Your journal is stored only in this browser profile. Clearing site data
        can remove it, so download a backup regularly and keep it somewhere
        safe.
      </p>

      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <section className="backup-panel">
        <h2>Download a backup</h2>
        <p>
          The JSON file includes every profile, event, string installation,
          reminder, and usual setup.
        </p>
        {counts && (
          <p className="record-summary">
            Current journal: {counts.assets} profiles · {counts.events} events ·{' '}
            {counts.installations} string records · {counts.reminders} reminders
          </p>
        )}
        <button className="button" disabled={busy} onClick={download}>
          {busy ? 'Working…' : 'Download backup'}
        </button>
      </section>

      <section className="backup-panel">
        <h2>Restore from a backup</h2>
        <p>
          Choose a String Ledger JSON backup. It will be checked completely
          before your journal is changed.
        </p>
        <label className="file-field">
          Backup file
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
        </label>

        {candidate && (
          <div className="restore-preview">
            <h3>Ready to restore</h3>
            <p>
              <strong>{recordCount(candidate)} records</strong> exported{' '}
              {formatDate(candidate.exportedAt.slice(0, 10))}
            </p>
            <ul>
              <li>{candidate.data.assets.length} profiles</li>
              <li>{candidate.data.events.length} events</li>
              <li>{candidate.data.installations.length} string records</li>
              <li>{candidate.data.reminders.length} reminders</li>
              <li>{candidate.data.usualSetups.length} usual setups</li>
            </ul>
            <p className="warning">
              <strong>This replaces the entire current journal.</strong> It does
              not merge records. Download the current journal first if you may
              need it.
            </p>
            <label className="confirm-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I understand that my current journal will be replaced.
            </label>
            <button
              className="button danger"
              disabled={!confirmed || busy}
              onClick={replaceJournal}
            >
              {busy ? 'Restoring…' : 'Replace journal from backup'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
