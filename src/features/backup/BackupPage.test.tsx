import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { db } from '../../db';
import { createAsset } from '../../services';
import { BACKUP_FORMAT, BACKUP_VERSION, type JournalBackup } from './backup';

const stamp = '2026-07-24T12:00:00.000Z';

function renderBackupPage() {
  return render(
    <MemoryRouter initialEntries={['/backup']}>
      <App />
    </MemoryRouter>,
  );
}

function fileWith(contents: string): File {
  return {
    name: 'string-ledger-backup.json',
    type: 'application/json',
    text: async () => contents,
  } as File;
}

function importedBackup(): JournalBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: stamp,
    data: {
      assets: [
        {
          id: 'imported-bow',
          profileType: 'bow',
          name: 'Imported bow',
          status: 'active',
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
      events: [],
      installations: [],
      reminders: [],
      usualSetups: [],
    },
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  cleanup();
  db.close();
  vi.restoreAllMocks();
});

describe('backup page', () => {
  it('downloads the complete current journal as JSON', async () => {
    await createAsset({ profileType: 'bow', name: 'Download me' });
    const createObjectURL = vi.fn(() => 'blob:string-ledger');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    renderBackupPage();
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Backup downloaded',
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:string-ledger');
  });

  it('previews a valid backup and requires explicit replacement confirmation', async () => {
    await createAsset({ profileType: 'bow', name: 'Current bow' });
    renderBackupPage();
    fireEvent.change(screen.getByLabelText('Backup file'), {
      target: { files: [fileWith(JSON.stringify(importedBackup()))] },
    });

    expect(
      await screen.findByRole('heading', { name: 'Ready to restore' }),
    ).toBeInTheDocument();
    const replace = screen.getByRole('button', {
      name: 'Replace journal from backup',
    });
    expect(replace).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        'I understand that my current journal will be replaced.',
      ),
    );
    expect(replace).toBeEnabled();
    fireEvent.click(replace);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Backup restored',
    );
    await waitFor(async () => {
      expect((await db.assets.toArray()).map((asset) => asset.name)).toEqual([
        'Imported bow',
      ]);
    });
  });

  it('shows validation errors without changing the journal', async () => {
    await createAsset({ profileType: 'bow', name: 'Safe bow' });
    renderBackupPage();
    fireEvent.change(screen.getByLabelText('Backup file'), {
      target: { files: [fileWith('{not json')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'not valid JSON',
    );
    expect((await db.assets.toArray()).map((asset) => asset.name)).toEqual([
      'Safe bow',
    ]);
  });
});
