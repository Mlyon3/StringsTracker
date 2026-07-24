import { describe, expect, it } from 'vitest';
import type { StringInstallation } from '../../types';
import { buildProductSuggestions, matchingSuggestions } from './stringEntry';

function installation(
  id: string,
  installedDate: string,
  brand: string,
  model: string,
  tensionOrGauge?: string,
): StringInstallation {
  return {
    id,
    assetId: 'instrument',
    maintenanceEventId: 'event',
    position: 'A',
    brand,
    model,
    tensionOrGauge,
    installedDate,
  };
}

describe('string-entry suggestions', () => {
  it('deduplicates products and ranks them by most recent local use', () => {
    const suggestions = buildProductSuggestions([
      installation('old', '2025-01-01', 'Larsen', 'Original', 'Medium'),
      installation('new', '2026-04-01', 'Pirastro', 'Passione', 'Strong'),
      installation('repeat', '2026-01-01', 'Larsen', 'Original', 'Medium'),
    ]);

    expect(suggestions).toEqual([
      {
        brand: 'Pirastro',
        model: 'Passione',
        tensionOrGauge: 'Strong',
        lastUsedDate: '2026-04-01',
      },
      {
        brand: 'Larsen',
        model: 'Original',
        tensionOrGauge: 'Medium',
        lastUsedDate: '2026-01-01',
      },
    ]);
  });

  it('filters models and gauges case-insensitively by exact selected details', () => {
    const suggestions = buildProductSuggestions([
      installation('one', '2026-01-01', 'Larsen', 'Original', 'Medium'),
      installation('two', '2026-02-01', 'Larsen', 'Soloist', 'Strong'),
      installation('three', '2026-03-01', 'Pirastro', 'Passione', 'Medium'),
    ]);

    expect(
      matchingSuggestions(suggestions, 'larsen').map((item) => item.model),
    ).toEqual(['Soloist', 'Original']);
    expect(matchingSuggestions(suggestions, 'LARSEN', 'original')).toHaveLength(
      1,
    );
  });
});
