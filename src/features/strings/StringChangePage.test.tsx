import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { db } from '../../db';
import { createAsset, logStringChange } from '../../services';

let assetId: string;

beforeEach(async () => {
  await db.delete();
  await db.open();
  const asset = await createAsset({
    profileType: 'instrument',
    name: 'Cello',
    instrumentFamily: 'cello',
  });
  assetId = asset.id;
  await logStringChange(
    assetId,
    '2026-01-01',
    ['A', 'D', 'G', 'C'].map((position) => ({
      position,
      brand: 'First Brand',
      model: `${position} model`,
      tensionOrGauge: 'Medium',
    })),
  );
  await db.usualSetups.put({
    assetId,
    strings: ['A', 'D', 'G', 'C'].map((position) => ({
      position,
      brand: 'Usual Brand',
      model: `${position} usual`,
      tensionOrGauge: 'Light',
    })),
    updatedAt: '2026-01-15T12:00:00.000Z',
  });
  await logStringChange(assetId, '2026-02-01', [
    {
      position: 'A',
      brand: 'Recent Brand',
      model: 'Recent model',
      tensionOrGauge: 'Strong',
    },
  ]);
});

afterEach(() => {
  cleanup();
  db.close();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/assets/${assetId}/strings`]}>
      <App />
    </MemoryRouter>,
  );
}

describe('string-change prefill', () => {
  it('reuses the current, usual, and most recent setups in one tap', async () => {
    renderPage();
    const current = await screen.findByRole('button', {
      name: 'Use current setup',
    });

    fireEvent.click(current);
    expect(
      screen
        .getAllByLabelText('Brand')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['Recent Brand', 'First Brand', 'First Brand', 'First Brand']);

    fireEvent.click(screen.getByRole('button', { name: 'Use usual setup' }));
    expect(
      screen
        .getAllByLabelText('Brand')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['Usual Brand', 'Usual Brand', 'Usual Brand', 'Usual Brand']);

    fireEvent.click(
      screen.getByRole('button', { name: 'Use most recent entry' }),
    );
    expect(screen.getAllByLabelText('Brand')).toHaveLength(1);
    expect(screen.getByLabelText('Brand')).toHaveValue('Recent Brand');
    expect(screen.getByLabelText('A')).toBeChecked();
    expect(screen.getByLabelText('D')).not.toBeChecked();
  });

  it('keeps manual edits controlled and copies the first selected string', async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use current setup' }),
    );
    const brands = screen.getAllByLabelText('Brand');
    fireEvent.change(brands[0], { target: { value: 'Copied Brand' } });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Apply first string’s details to all selected',
      }),
    );

    expect(
      screen
        .getAllByLabelText('Brand')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['Copied Brand', 'Copied Brand', 'Copied Brand', 'Copied Brand']);
  });

  it('offers local product history through dependent datalists', async () => {
    const view = renderPage();
    await screen.findByRole('button', { name: 'Use current setup' });
    const brand = screen.getAllByLabelText('Brand')[0];
    fireEvent.change(brand, { target: { value: 'First Brand' } });

    const model = screen.getAllByLabelText('Model')[0] as HTMLInputElement;
    const list = view.container.querySelector<HTMLDataListElement>(
      `#${model.getAttribute('list')}`,
    );
    expect([...list!.options].map((option) => option.value)).toEqual([
      'A model',
      'C model',
      'D model',
      'G model',
    ]);
  });
});
