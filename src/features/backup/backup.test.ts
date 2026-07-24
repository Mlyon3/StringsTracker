import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JournalDB } from '../../db';
import type { JournalBackup } from './backup';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupValidationError,
  createBackup,
  parseBackup,
  restoreBackup,
} from './backup';

const stamp = '2026-07-24T12:00:00.000Z';

function representativeBackup(): JournalBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: stamp,
    data: {
      assets: [
        {
          id: 'cello',
          profileType: 'instrument',
          name: 'Cello',
          instrumentFamily: 'cello',
          status: 'active',
          createdAt: stamp,
          updatedAt: stamp,
        },
        {
          id: 'bow',
          profileType: 'bow',
          name: 'Bow',
          status: 'archived',
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
      events: [
        {
          id: 'strings',
          assetId: 'cello',
          eventType: 'string-change',
          date: '2026-01-01',
          createdAt: stamp,
          updatedAt: stamp,
        },
        {
          id: 'rehair',
          assetId: 'bow',
          eventType: 'bow-rehair',
          workType: 'Rehair',
          date: '2026-02-01',
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
      installations: [
        {
          id: 'a-string',
          assetId: 'cello',
          maintenanceEventId: 'strings',
          position: 'A',
          brand: 'Larsen',
          model: 'Original',
          installedDate: '2026-01-01',
        },
      ],
      reminders: [
        {
          id: 'reminder',
          assetId: 'bow',
          maintenanceEventId: 'rehair',
          title: 'Consider a bow rehair',
          dueDate: '2026-08-01',
          status: 'completed',
          createdAt: stamp,
        },
      ],
      usualSetups: [
        {
          assetId: 'cello',
          strings: [{ position: 'A', brand: 'Larsen', model: 'Original' }],
          updatedAt: stamp,
        },
      ],
    },
  };
}

let database: JournalDB;

beforeEach(async () => {
  database = new JournalDB(`backup-${crypto.randomUUID()}`);
  await database.open();
});

afterEach(async () => {
  await database.delete();
});

describe('journal backup', () => {
  it('round-trips every table and relationship', async () => {
    const expected = representativeBackup();
    await restoreBackup(JSON.stringify(expected), database);
    const exported = await createBackup(database);

    expect(exported.format).toBe(BACKUP_FORMAT);
    expect(exported.version).toBe(BACKUP_VERSION);
    expect(exported.data.assets).toHaveLength(2);
    expect(exported.data.installations[0].maintenanceEventId).toBe('strings');
    expect(exported.data.reminders[0].status).toBe('completed');
    expect(exported.data.usualSetups[0].strings[0].brand).toBe('Larsen');

    const fresh = new JournalDB(`backup-fresh-${crypto.randomUUID()}`);
    await fresh.open();
    await restoreBackup(exported, fresh);
    expect(JSON.stringify((await createBackup(fresh)).data)).toBe(
      JSON.stringify(exported.data),
    );
    await fresh.delete();
  });

  it('supports a valid empty backup', async () => {
    const backup = representativeBackup();
    for (const key of Object.keys(
      backup.data,
    ) as (keyof JournalBackup['data'])[]) {
      backup.data[key] = [];
    }
    await restoreBackup(backup, database);
    expect(await database.assets.count()).toBe(0);
  });

  it('rejects malformed JSON and unsupported versions', () => {
    expect(() => parseBackup('{nope')).toThrow('not valid JSON');
    const backup = representativeBackup() as unknown as { version: number };
    backup.version = 2;
    expect(() => parseBackup(backup)).toThrow('version 2 is not supported');
  });

  it('rejects unknown properties and invalid dates', () => {
    const unknown = representativeBackup() as JournalBackup & {
      surprise?: boolean;
    };
    unknown.surprise = true;
    expect(() => parseBackup(unknown)).toThrow('backup.surprise');

    const invalidDate = representativeBackup();
    invalidDate.data.events[0].date = '2026-02-30';
    expect(() => parseBackup(invalidDate)).toThrow(
      'must be a valid calendar date',
    );
  });

  it('rejects duplicate IDs and duplicate active positions', () => {
    const duplicateId = representativeBackup();
    duplicateId.data.assets.push({ ...duplicateId.data.assets[0] });
    expect(() => parseBackup(duplicateId)).toThrow('duplicates id');

    const duplicatePosition = representativeBackup();
    duplicatePosition.data.installations.push({
      ...duplicatePosition.data.installations[0],
      id: 'another-a-string',
    });
    expect(() => parseBackup(duplicatePosition)).toThrow(
      'duplicates an active position',
    );
  });

  it('rejects dangling and cross-asset relationships', () => {
    const dangling = representativeBackup();
    dangling.data.events[0].assetId = 'missing';
    expect(() => parseBackup(dangling)).toThrow(
      'does not reference an imported asset',
    );

    const crossAsset = representativeBackup();
    crossAsset.data.reminders[0].assetId = 'cello';
    expect(() => parseBackup(crossAsset)).toThrow(
      'must reference an event for the same asset',
    );
  });

  it('does not mutate existing data when validation fails', async () => {
    await database.assets.add({
      id: 'existing',
      profileType: 'bow',
      name: 'Existing bow',
      status: 'active',
      createdAt: stamp,
      updatedAt: stamp,
    });
    const invalid = representativeBackup();
    invalid.data.events[0].assetId = 'missing';

    await expect(restoreBackup(invalid, database)).rejects.toBeInstanceOf(
      BackupValidationError,
    );
    expect((await database.assets.toArray()).map((asset) => asset.id)).toEqual([
      'existing',
    ]);
  });

  it('rolls back every table when a database write fails', async () => {
    await database.assets.add({
      id: 'existing',
      profileType: 'bow',
      name: 'Existing bow',
      status: 'active',
      createdAt: stamp,
      updatedAt: stamp,
    });
    vi.spyOn(database.events, 'bulkAdd').mockRejectedValueOnce(
      new Error('simulated write failure'),
    );

    await expect(
      restoreBackup(representativeBackup(), database),
    ).rejects.toThrow('simulated write failure');
    expect((await database.assets.toArray()).map((asset) => asset.id)).toEqual([
      'existing',
    ]);
    expect(await database.events.count()).toBe(0);
  });
});
