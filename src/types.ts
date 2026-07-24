export type ProfileType = 'instrument' | 'bow';
export type InstrumentFamily =
  | 'violin'
  | 'viola'
  | 'cello'
  | 'double bass'
  | 'other';
export interface Asset {
  id: string;
  profileType: ProfileType;
  name: string;
  maker?: string;
  year?: number;
  instrumentFamily?: InstrumentFamily;
  customPositions?: string[];
  photo?: string;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}
export type EventType =
  | 'string-change'
  | 'bow-rehair'
  | 'bow-repair'
  | 'instrument-adjustment'
  | 'instrument-repair'
  | 'appraisal'
  | 'general-note';
export interface MaintenanceEvent {
  id: string;
  assetId: string;
  eventType: EventType;
  workType?: string;
  date: string;
  provider?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface StringInstallation {
  id: string;
  assetId: string;
  maintenanceEventId: string;
  position: string;
  brand: string;
  model: string;
  tensionOrGauge?: string;
  installedDate: string;
  removedDate?: string;
  cost?: number;
  notes?: string;
}
export interface Reminder {
  id: string;
  assetId: string;
  maintenanceEventId?: string;
  title: string;
  dueDate: string;
  status: 'active' | 'completed' | 'dismissed';
  createdAt: string;
}
export interface UsualString {
  position: string;
  brand: string;
  model: string;
  tensionOrGauge?: string;
}
export interface UsualSetup {
  assetId: string;
  strings: UsualString[];
  updatedAt: string;
}
export const POSITIONS: Record<Exclude<InstrumentFamily, 'other'>, string[]> = {
  violin: ['E', 'A', 'D', 'G'],
  viola: ['A', 'D', 'G', 'C'],
  cello: ['A', 'D', 'G', 'C'],
  'double bass': ['G', 'D', 'A', 'E'],
};
