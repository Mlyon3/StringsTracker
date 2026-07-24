import { db, type JournalDB } from '../../db';
import type {
  Asset,
  MaintenanceEvent,
  Reminder,
  StringInstallation,
  UsualSetup,
} from '../../types';

export const BACKUP_FORMAT = 'string-ledger-backup';
export const BACKUP_VERSION = 1;

export interface BackupData {
  assets: Asset[];
  events: MaintenanceEvent[];
  installations: StringInstallation[];
  reminders: Reminder[];
  usualSetups: UsualSetup[];
}

export interface JournalBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: BackupData;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

type JsonObject = Record<string, unknown>;

const profileTypes = ['instrument', 'bow'] as const;
const instrumentFamilies = [
  'violin',
  'viola',
  'cello',
  'double bass',
  'other',
] as const;
const assetStatuses = ['active', 'archived'] as const;
const eventTypes = [
  'string-change',
  'bow-rehair',
  'bow-repair',
  'instrument-adjustment',
  'instrument-repair',
  'appraisal',
  'general-note',
] as const;
const reminderStatuses = ['active', 'completed', 'dismissed'] as const;

function fail(path: string, message: string): never {
  throw new BackupValidationError(`${path}: ${message}`);
}

function object(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  allowed: readonly string[],
  path: string,
) {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) fail(`${path}.${unknown}`, 'is not supported');
}

function string(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    fail(path, 'must be a non-empty string');
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path, true);
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'must be a finite number');
  }
  return value;
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    fail(path, `must be one of: ${values.join(', ')}`);
  }
  return value as T;
}

function timestamp(value: unknown, path: string): string {
  const result = string(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || Number.isNaN(Date.parse(result))) {
    fail(path, 'must be an ISO timestamp');
  }
  return result;
}

function date(value: unknown, path: string): string {
  const result = string(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    fail(path, 'must be a date in YYYY-MM-DD format');
  }
  const parsed = new Date(`${result}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== result
  ) {
    fail(path, 'must be a valid calendar date');
  }
  return result;
}

function optionalDate(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : date(value, path);
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value;
}

function parseAsset(value: unknown, path: string): Asset {
  const row = object(value, path);
  exactKeys(
    row,
    [
      'id',
      'profileType',
      'name',
      'maker',
      'year',
      'instrumentFamily',
      'customPositions',
      'photo',
      'notes',
      'status',
      'createdAt',
      'updatedAt',
    ],
    path,
  );
  const profileType = oneOf(
    row.profileType,
    profileTypes,
    `${path}.profileType`,
  );
  const instrumentFamily =
    row.instrumentFamily === undefined
      ? undefined
      : oneOf(
          row.instrumentFamily,
          instrumentFamilies,
          `${path}.instrumentFamily`,
        );
  if (profileType === 'instrument' && !instrumentFamily) {
    fail(`${path}.instrumentFamily`, 'is required for an instrument');
  }
  if (profileType === 'bow' && instrumentFamily !== undefined) {
    fail(`${path}.instrumentFamily`, 'is only valid for an instrument');
  }
  const customPositions =
    row.customPositions === undefined
      ? undefined
      : array(row.customPositions, `${path}.customPositions`).map(
          (position, index) =>
            string(position, `${path}.customPositions[${index}]`),
        );
  if (
    instrumentFamily === 'other' &&
    (!customPositions || !customPositions.length)
  ) {
    fail(
      `${path}.customPositions`,
      'must list positions for a custom instrument',
    );
  }
  return {
    id: string(row.id, `${path}.id`),
    profileType,
    name: string(row.name, `${path}.name`),
    maker: optionalString(row.maker, `${path}.maker`),
    year: optionalNumber(row.year, `${path}.year`),
    instrumentFamily,
    customPositions,
    photo: optionalString(row.photo, `${path}.photo`),
    notes: optionalString(row.notes, `${path}.notes`),
    status: oneOf(row.status, assetStatuses, `${path}.status`),
    createdAt: timestamp(row.createdAt, `${path}.createdAt`),
    updatedAt: timestamp(row.updatedAt, `${path}.updatedAt`),
  };
}

function parseEvent(value: unknown, path: string): MaintenanceEvent {
  const row = object(value, path);
  exactKeys(
    row,
    [
      'id',
      'assetId',
      'eventType',
      'workType',
      'date',
      'provider',
      'cost',
      'notes',
      'createdAt',
      'updatedAt',
    ],
    path,
  );
  return {
    id: string(row.id, `${path}.id`),
    assetId: string(row.assetId, `${path}.assetId`),
    eventType: oneOf(row.eventType, eventTypes, `${path}.eventType`),
    workType: optionalString(row.workType, `${path}.workType`),
    date: date(row.date, `${path}.date`),
    provider: optionalString(row.provider, `${path}.provider`),
    cost: optionalNumber(row.cost, `${path}.cost`),
    notes: optionalString(row.notes, `${path}.notes`),
    createdAt: timestamp(row.createdAt, `${path}.createdAt`),
    updatedAt: timestamp(row.updatedAt, `${path}.updatedAt`),
  };
}

function parseInstallation(value: unknown, path: string): StringInstallation {
  const row = object(value, path);
  exactKeys(
    row,
    [
      'id',
      'assetId',
      'maintenanceEventId',
      'position',
      'brand',
      'model',
      'tensionOrGauge',
      'installedDate',
      'removedDate',
      'cost',
      'notes',
    ],
    path,
  );
  return {
    id: string(row.id, `${path}.id`),
    assetId: string(row.assetId, `${path}.assetId`),
    maintenanceEventId: string(
      row.maintenanceEventId,
      `${path}.maintenanceEventId`,
    ),
    position: string(row.position, `${path}.position`),
    brand: string(row.brand, `${path}.brand`),
    model: string(row.model, `${path}.model`),
    tensionOrGauge: optionalString(
      row.tensionOrGauge,
      `${path}.tensionOrGauge`,
    ),
    installedDate: date(row.installedDate, `${path}.installedDate`),
    removedDate: optionalDate(row.removedDate, `${path}.removedDate`),
    cost: optionalNumber(row.cost, `${path}.cost`),
    notes: optionalString(row.notes, `${path}.notes`),
  };
}

function parseReminder(value: unknown, path: string): Reminder {
  const row = object(value, path);
  exactKeys(
    row,
    [
      'id',
      'assetId',
      'maintenanceEventId',
      'title',
      'dueDate',
      'status',
      'createdAt',
    ],
    path,
  );
  return {
    id: string(row.id, `${path}.id`),
    assetId: string(row.assetId, `${path}.assetId`),
    maintenanceEventId: optionalString(
      row.maintenanceEventId,
      `${path}.maintenanceEventId`,
    ),
    title: string(row.title, `${path}.title`),
    dueDate: date(row.dueDate, `${path}.dueDate`),
    status: oneOf(row.status, reminderStatuses, `${path}.status`),
    createdAt: timestamp(row.createdAt, `${path}.createdAt`),
  };
}

function parseUsualSetup(value: unknown, path: string): UsualSetup {
  const row = object(value, path);
  exactKeys(row, ['assetId', 'strings', 'updatedAt'], path);
  return {
    assetId: string(row.assetId, `${path}.assetId`),
    strings: array(row.strings, `${path}.strings`).map((value, index) => {
      const itemPath = `${path}.strings[${index}]`;
      const item = object(value, itemPath);
      exactKeys(
        item,
        ['position', 'brand', 'model', 'tensionOrGauge'],
        itemPath,
      );
      return {
        position: string(item.position, `${itemPath}.position`),
        brand: string(item.brand, `${itemPath}.brand`),
        model: string(item.model, `${itemPath}.model`),
        tensionOrGauge: optionalString(
          item.tensionOrGauge,
          `${itemPath}.tensionOrGauge`,
        ),
      };
    }),
    updatedAt: timestamp(row.updatedAt, `${path}.updatedAt`),
  };
}

function assertUniqueIds(rows: { id: string }[], path: string) {
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    if (ids.has(row.id))
      fail(`${path}[${index}].id`, `duplicates id "${row.id}"`);
    ids.add(row.id);
  });
}

function validateRelationships(data: BackupData) {
  assertUniqueIds(data.assets, 'data.assets');
  assertUniqueIds(data.events, 'data.events');
  assertUniqueIds(data.installations, 'data.installations');
  assertUniqueIds(data.reminders, 'data.reminders');

  const assets = new Map(data.assets.map((asset) => [asset.id, asset]));
  const events = new Map(data.events.map((event) => [event.id, event]));
  const usualAssetIds = new Set<string>();
  const activePositions = new Set<string>();

  data.events.forEach((event, index) => {
    if (!assets.has(event.assetId)) {
      fail(
        `data.events[${index}].assetId`,
        'does not reference an imported asset',
      );
    }
  });
  data.installations.forEach((installation, index) => {
    const asset = assets.get(installation.assetId);
    const event = events.get(installation.maintenanceEventId);
    if (!asset)
      fail(
        `data.installations[${index}].assetId`,
        'does not reference an imported asset',
      );
    if (asset.profileType !== 'instrument')
      fail(
        `data.installations[${index}].assetId`,
        'must reference an instrument',
      );
    if (!event)
      fail(
        `data.installations[${index}].maintenanceEventId`,
        'does not reference an imported event',
      );
    if (
      event.assetId !== installation.assetId ||
      event.eventType !== 'string-change'
    ) {
      fail(
        `data.installations[${index}].maintenanceEventId`,
        'must reference a string change for the same instrument',
      );
    }
    if (
      installation.removedDate &&
      installation.removedDate < installation.installedDate
    ) {
      fail(
        `data.installations[${index}].removedDate`,
        'cannot be before the installed date',
      );
    }
    if (!installation.removedDate) {
      const key = `${installation.assetId}\u0000${installation.position}`;
      if (activePositions.has(key))
        fail(`data.installations[${index}]`, 'duplicates an active position');
      activePositions.add(key);
    }
  });
  data.reminders.forEach((reminder, index) => {
    if (!assets.has(reminder.assetId))
      fail(
        `data.reminders[${index}].assetId`,
        'does not reference an imported asset',
      );
    if (reminder.maintenanceEventId) {
      const event = events.get(reminder.maintenanceEventId);
      if (!event || event.assetId !== reminder.assetId) {
        fail(
          `data.reminders[${index}].maintenanceEventId`,
          'must reference an event for the same asset',
        );
      }
    }
  });
  data.usualSetups.forEach((setup, index) => {
    const asset = assets.get(setup.assetId);
    if (!asset || asset.profileType !== 'instrument')
      fail(
        `data.usualSetups[${index}].assetId`,
        'must reference an imported instrument',
      );
    if (usualAssetIds.has(setup.assetId))
      fail(`data.usualSetups[${index}].assetId`, 'duplicates a usual setup');
    usualAssetIds.add(setup.assetId);
  });
}

export function parseBackup(input: string | unknown): JournalBackup {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw new BackupValidationError('The selected file is not valid JSON.');
    }
  }
  const root = object(value, 'backup');
  exactKeys(root, ['format', 'version', 'exportedAt', 'data'], 'backup');
  if (root.format !== BACKUP_FORMAT)
    fail('backup.format', `must be "${BACKUP_FORMAT}"`);
  if (root.version !== BACKUP_VERSION)
    fail('backup.version', `version ${String(root.version)} is not supported`);
  const rawData = object(root.data, 'data');
  exactKeys(
    rawData,
    ['assets', 'events', 'installations', 'reminders', 'usualSetups'],
    'data',
  );
  const data: BackupData = {
    assets: array(rawData.assets, 'data.assets').map((row, index) =>
      parseAsset(row, `data.assets[${index}]`),
    ),
    events: array(rawData.events, 'data.events').map((row, index) =>
      parseEvent(row, `data.events[${index}]`),
    ),
    installations: array(rawData.installations, 'data.installations').map(
      (row, index) => parseInstallation(row, `data.installations[${index}]`),
    ),
    reminders: array(rawData.reminders, 'data.reminders').map((row, index) =>
      parseReminder(row, `data.reminders[${index}]`),
    ),
    usualSetups: array(rawData.usualSetups, 'data.usualSetups').map(
      (row, index) => parseUsualSetup(row, `data.usualSetups[${index}]`),
    ),
  };
  validateRelationships(data);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: timestamp(root.exportedAt, 'backup.exportedAt'),
    data,
  };
}

export async function createBackup(
  database: JournalDB = db,
): Promise<JournalBackup> {
  const [assets, events, installations, reminders, usualSetups] =
    await database.transaction(
      'r',
      [
        database.assets,
        database.events,
        database.installations,
        database.reminders,
        database.usualSetups,
      ],
      () =>
        Promise.all([
          database.assets.toArray(),
          database.events.toArray(),
          database.installations.toArray(),
          database.reminders.toArray(),
          database.usualSetups.toArray(),
        ]),
    );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { assets, events, installations, reminders, usualSetups },
  };
}

export async function restoreBackup(
  input: string | unknown,
  database: JournalDB = db,
): Promise<JournalBackup> {
  const backup = parseBackup(input);
  await database.transaction(
    'rw',
    [
      database.assets,
      database.events,
      database.installations,
      database.reminders,
      database.usualSetups,
    ],
    async () => {
      await Promise.all([
        database.installations.clear(),
        database.reminders.clear(),
        database.usualSetups.clear(),
        database.events.clear(),
        database.assets.clear(),
      ]);
      await database.assets.bulkAdd(backup.data.assets);
      await database.events.bulkAdd(backup.data.events);
      await database.installations.bulkAdd(backup.data.installations);
      await database.reminders.bulkAdd(backup.data.reminders);
      await database.usualSetups.bulkAdd(backup.data.usualSetups);
    },
  );
  return backup;
}

export function backupFilename(exportedAt: string) {
  return `string-ledger-backup-${exportedAt.slice(0, 10)}.json`;
}
