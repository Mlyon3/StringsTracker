import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '../../components/FormPage';
import { db } from '../../db';
import { age, formatDate } from '../../lib/dates';
import {
  createAsset,
  currentSetup,
  saveUsualSetup,
  seedDevelopment,
  setArchived,
} from '../../services';
import type { Asset } from '../../types';
import { EventCard } from '../maintenance/EventCard';

function AssetCard({ asset }: { asset: Asset }) {
  const setup = useLiveQuery(() => currentSetup(asset.id), [asset.id]) || [];
  const reminder = useLiveQuery(
    () =>
      db.reminders
        .where('assetId')
        .equals(asset.id)
        .filter((row) => row.status === 'active')
        .sortBy('dueDate'),
    [asset.id],
  )?.[0];
  const rehair = useLiveQuery(
    () =>
      db.events
        .where('assetId')
        .equals(asset.id)
        .filter((event) => event.eventType === 'bow-rehair')
        .reverse()
        .sortBy('date'),
    [asset.id],
  )?.[0];

  return (
    <article className="asset">
      <div>
        <p className="eyebrow">
          {asset.profileType === 'instrument' ? asset.instrumentFamily : 'Bow'}
        </p>
        <h2>
          <Link to={`/assets/${asset.id}`}>{asset.name}</Link>
        </h2>
        {asset.profileType === 'bow' && asset.maker && <p>{asset.maker}</p>}
      </div>
      {asset.profileType === 'instrument' ? (
        <div className="mini-setup">
          {setup.length ? (
            setup.map((string) => (
              <span key={string.id}>
                <b>{string.position}</b> {string.brand} ·{' '}
                {age(string.installedDate)}
              </span>
            ))
          ) : (
            <span>No strings recorded yet</span>
          )}
        </div>
      ) : (
        <p>
          {rehair
            ? `${age(rehair.date)} since last rehair`
            : 'No rehair recorded yet'}
        </p>
      )}
      {reminder && (
        <p className="reminder">
          Next thought: {formatDate(reminder.dueDate)} · {reminder.title}
        </p>
      )}
      <Link
        className="button secondary"
        to={`/assets/${asset.id}/${asset.profileType === 'instrument' ? 'strings' : 'maintenance'}`}
      >
        {asset.profileType === 'instrument'
          ? 'Log string change'
          : 'Log maintenance'}
      </Link>
    </article>
  );
}

export function DashboardPage() {
  const assets = useLiveQuery(() =>
    db.assets.where('status').equals('active').toArray(),
  );
  if (assets === undefined) return <p>Loading your journal…</p>;
  if (!assets.length) {
    return (
      <section className="hero">
        <p className="eyebrow">Private · local · offline</p>
        <h1>Care for what you play.</h1>
        <p>
          Keep a clear record of strings, rehairs, and the work that keeps your
          instruments ready.
        </p>
        <Link className="button" to="/new">
          Create your first profile
        </Link>
        {import.meta.env.DEV && (
          <button className="quiet" onClick={() => seedDevelopment()}>
            Load clearly marked demo data
          </button>
        )}
      </section>
    );
  }
  return (
    <>
      <div className="title-row">
        <div>
          <p className="eyebrow">Your workshop</p>
          <h1>Instruments &amp; bows</h1>
        </div>
        <Link className="button" to="/new">
          Add profile
        </Link>
      </div>
      <div className="asset-list">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </>
  );
}

export function NewAssetPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<'instrument' | 'bow'>('instrument');
  return (
    <FormPage
      title="Create a profile"
      onSubmit={async (form) => {
        const family = (form.get('family') ||
          'cello') as Asset['instrumentFamily'];
        const asset = await createAsset({
          profileType: type,
          name: String(form.get('name')),
          maker: String(form.get('maker') || '') || undefined,
          instrumentFamily: type === 'instrument' ? family : undefined,
          customPositions:
            family === 'other'
              ? String(form.get('positions'))
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : undefined,
        });
        navigate(type === 'instrument' ? `/assets/${asset.id}/strings` : '/');
      }}
    >
      <div className="segmented">
        <button
          type="button"
          className={type === 'instrument' ? 'active' : ''}
          onClick={() => setType('instrument')}
        >
          Instrument
        </button>
        <button
          type="button"
          className={type === 'bow' ? 'active' : ''}
          onClick={() => setType('bow')}
        >
          Bow
        </button>
      </div>
      <label>
        Name
        <input
          name="name"
          required
          autoFocus
          placeholder={type === 'instrument' ? 'Main cello' : 'Primary bow'}
        />
      </label>
      {type === 'bow' ? (
        <label>
          Maker (optional)
          <input name="maker" />
        </label>
      ) : (
        <>
          <label>
            Family
            <select name="family" defaultValue="cello">
              <option>violin</option>
              <option>viola</option>
              <option>cello</option>
              <option>double bass</option>
              <option>other</option>
            </select>
          </label>
          <label>
            Custom positions (for “other”)
            <input name="positions" placeholder="1, 2, 3, 4" />
          </label>
        </>
      )}
    </FormPage>
  );
}

export function ProfilePage() {
  const { id = '' } = useParams();
  const asset = useLiveQuery(() => db.assets.get(id), [id]);
  const setup = useLiveQuery(() => currentSetup(id), [id]) || [];
  const events =
    useLiveQuery(
      () => db.events.where('assetId').equals(id).reverse().sortBy('date'),
      [id],
    ) || [];
  if (!asset) return <p>Loading profile…</p>;
  return (
    <>
      <div className="title-row">
        <div>
          <p className="eyebrow">{asset.profileType}</p>
          <h1>{asset.name}</h1>
        </div>
        <div className="actions">
          <Link
            className="button"
            to={`/assets/${id}/${asset.profileType === 'instrument' ? 'strings' : 'maintenance'}`}
          >
            Log {asset.profileType === 'instrument' ? 'strings' : 'maintenance'}
          </Link>
          {asset.profileType === 'instrument' && (
            <Link className="button secondary" to={`/assets/${id}/maintenance`}>
              Log service
            </Link>
          )}
        </div>
      </div>
      {asset.profileType === 'instrument' && (
        <section>
          <div className="section-heading">
            <h2>Current setup</h2>
            {setup.length > 0 && (
              <button
                className="text-button"
                onClick={() => saveUsualSetup(id)}
              >
                Save as usual setup
              </button>
            )}
          </div>
          <div className="setup-grid">
            {setup.length ? (
              setup.map((string) => (
                <article key={string.id}>
                  <strong>{string.position}</strong>
                  <span>
                    {string.brand} {string.model}
                  </span>
                  <small>
                    Installed {formatDate(string.installedDate)} ·{' '}
                    {age(string.installedDate)} ago
                  </small>
                </article>
              ))
            ) : (
              <p>No current strings recorded.</p>
            )}
          </div>
        </section>
      )}
      <section>
        <h2>Maintenance timeline</h2>
        {events.length ? (
          <div className="timeline">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p>No maintenance recorded yet.</p>
        )}
      </section>
      <section>
        <h2>Profile details</h2>
        <p>
          {asset.maker || 'Maker not recorded'}
          {asset.instrumentFamily && ` · ${asset.instrumentFamily}`}
        </p>
        <button
          className="quiet"
          onClick={() => setArchived(id, asset.status === 'active')}
        >
          {asset.status === 'active' ? 'Archive profile' : 'Restore profile'}
        </button>
      </section>
    </>
  );
}

export function ArchivedPage() {
  const assets =
    useLiveQuery(() =>
      db.assets.where('status').equals('archived').toArray(),
    ) || [];
  return (
    <>
      <h1>Archived profiles</h1>
      {assets.length ? (
        assets.map((asset) => (
          <article className="reminder-row" key={asset.id}>
            <Link to={`/assets/${asset.id}`}>{asset.name}</Link>
            <button onClick={() => setArchived(asset.id, false)}>
              Restore
            </button>
          </article>
        ))
      ) : (
        <p>No archived profiles.</p>
      )}
    </>
  );
}
