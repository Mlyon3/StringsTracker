import { db, type JournalDB } from '../../db';
import type { StringInstallation, UsualString } from '../../types';

export interface StringDraft {
  brand: string;
  model: string;
  tensionOrGauge: string;
}

export interface StringProductSuggestion extends StringDraft {
  lastUsedDate: string;
}

export interface StringEntryOptions {
  current: UsualString[];
  recent: UsualString[];
  suggestions: StringProductSuggestion[];
}

export const emptyStringDraft = (): StringDraft => ({
  brand: '',
  model: '',
  tensionOrGauge: '',
});

export function installationToDraft(
  installation: Pick<
    StringInstallation,
    'position' | 'brand' | 'model' | 'tensionOrGauge'
  >,
): UsualString {
  return {
    position: installation.position,
    brand: installation.brand,
    model: installation.model,
    tensionOrGauge: installation.tensionOrGauge,
  };
}

export function buildProductSuggestions(
  installations: StringInstallation[],
): StringProductSuggestion[] {
  const newestFirst = [...installations].sort(
    (left, right) =>
      right.installedDate.localeCompare(left.installedDate) ||
      left.brand.localeCompare(right.brand) ||
      left.model.localeCompare(right.model) ||
      (left.tensionOrGauge || '').localeCompare(right.tensionOrGauge || ''),
  );
  const products = new Map<string, StringProductSuggestion>();
  for (const installation of newestFirst) {
    const tensionOrGauge = installation.tensionOrGauge || '';
    const key = `${installation.brand}\u0000${installation.model}\u0000${tensionOrGauge}`;
    if (!products.has(key)) {
      products.set(key, {
        brand: installation.brand,
        model: installation.model,
        tensionOrGauge,
        lastUsedDate: installation.installedDate,
      });
    }
  }
  return [...products.values()];
}

export async function loadStringEntryOptions(
  assetId: string,
  database: JournalDB = db,
): Promise<StringEntryOptions> {
  const [allInstallations, assetEvents] = await Promise.all([
    database.installations.toArray(),
    database.events.where('assetId').equals(assetId).toArray(),
  ]);
  const assetInstallations = allInstallations.filter(
    (installation) => installation.assetId === assetId,
  );
  const latestStringEvent = assetEvents
    .filter((event) => event.eventType === 'string-change')
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.createdAt.localeCompare(left.createdAt),
    )[0];

  return {
    current: assetInstallations
      .filter((installation) => !installation.removedDate)
      .map(installationToDraft),
    recent: latestStringEvent
      ? assetInstallations
          .filter(
            (installation) =>
              installation.maintenanceEventId === latestStringEvent.id,
          )
          .map(installationToDraft)
      : [],
    suggestions: buildProductSuggestions(allInstallations),
  };
}

export function matchingSuggestions(
  suggestions: StringProductSuggestion[],
  brand: string,
  model = '',
) {
  const normalizedBrand = brand.trim().toLocaleLowerCase();
  const normalizedModel = model.trim().toLocaleLowerCase();
  return suggestions.filter(
    (suggestion) =>
      (!normalizedBrand ||
        suggestion.brand.toLocaleLowerCase() === normalizedBrand) &&
      (!normalizedModel ||
        suggestion.model.toLocaleLowerCase() === normalizedModel),
  );
}
