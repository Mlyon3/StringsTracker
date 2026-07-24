import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { db } from './db';
import {
  createAsset,
  currentSetup,
  logMaintenance,
  setArchived,
} from './services';

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => db.close());

describe('journal routes', () => {
  it('creates an instrument and records a partial string setup', async () => {
    renderApp('/new');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Touring cello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(
      await screen.findByRole('heading', { name: 'Log string change' }),
    ).toBeInTheDocument();
    for (const position of ['D', 'G', 'C']) {
      fireEvent.click(screen.getByLabelText(position));
    }
    fireEvent.change(screen.getByLabelText('Brand'), {
      target: { value: 'Larsen' },
    });
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: 'Original' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(
      await screen.findByRole('heading', { name: 'Touring cello' }),
    ).toBeInTheDocument();
    const asset = await db.assets
      .filter((row) => row.name === 'Touring cello')
      .first();
    expect(asset && (await currentSetup(asset.id))).toHaveLength(1);
  });

  it('shows persisted assets, reminders, and archived profiles on their routes', async () => {
    const bow = await createAsset({ profileType: 'bow', name: 'Primary bow' });
    await logMaintenance(bow.id, 'bow-rehair', 'Rehair', '2026-01-01', {
      reminderDate: '2026-07-01',
    });
    const archived = await createAsset({
      profileType: 'instrument',
      name: 'Student violin',
      instrumentFamily: 'violin',
    });
    await setArchived(archived.id, true);

    let view = renderApp('/');
    expect(
      await screen.findByRole('link', { name: 'Primary bow' }),
    ).toBeInTheDocument();

    view.unmount();
    view = renderApp('/reminders');
    expect(
      await screen.findByText('Consider a bow rehair'),
    ).toBeInTheDocument();

    await waitFor(() => expect(db.reminders.count()).resolves.toBe(1));
    view.unmount();
    renderApp('/archived');
    expect(
      await screen.findByRole('link', { name: 'Student violin' }),
    ).toBeInTheDocument();
  });
});
