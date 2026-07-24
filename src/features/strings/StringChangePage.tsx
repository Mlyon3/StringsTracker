import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '../../components/FormPage';
import { StringRows } from '../../components/StringRows';
import { db, today } from '../../db';
import { logStringChange } from '../../services';
import { POSITIONS, type UsualString } from '../../types';
import {
  emptyStringDraft,
  loadStringEntryOptions,
  type StringDraft,
} from './stringEntry';

export function StringChangePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const asset = useLiveQuery(() => db.assets.get(id), [id]);
  const usual = useLiveQuery(() => db.usualSetups.get(id), [id]);
  const entryOptions = useLiveQuery(() => loadStringEntryOptions(id), [id]);
  const positions = asset
    ? asset.instrumentFamily === 'other'
      ? asset.customPositions || []
      : POSITIONS[asset.instrumentFamily || 'violin']
    : [];
  const [selection, setSelection] = useState<string[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StringDraft>>({});
  const selected = selection ?? positions;
  const visibleDrafts = Object.fromEntries(
    positions.map((position) => [
      position,
      drafts[position] || emptyStringDraft(),
    ]),
  );

  const applySetup = (strings: UsualString[]) => {
    const available = new Set(positions);
    const applicable = strings.filter((string) =>
      available.has(string.position),
    );
    setSelection(
      positions.filter((position) =>
        applicable.some((string) => string.position === position),
      ),
    );
    setDrafts((current) => {
      const next = { ...current };
      for (const string of applicable) {
        next[string.position] = {
          brand: string.brand,
          model: string.model,
          tensionOrGauge: string.tensionOrGauge || '',
        };
      }
      return next;
    });
  };

  const changeDraft = (
    position: string,
    field: keyof StringDraft,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [position]: {
        ...(current[position] || emptyStringDraft()),
        [field]: value,
      },
    }));
  };

  const copyFirst = () => {
    const first = selected[0];
    if (!first) return;
    const source = visibleDrafts[first];
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(
        selected.map((position) => [position, { ...source }]),
      ),
    }));
  };
  if (!asset) return null;
  return (
    <FormPage
      title="Log string change"
      intro="Choose one string or the full set. Each position can keep its own product."
      onSubmit={async (form) => {
        const strings = selected.map((position) => ({
          position,
          brand: visibleDrafts[position].brand,
          model: visibleDrafts[position].model,
          tensionOrGauge: visibleDrafts[position].tensionOrGauge || undefined,
        }));
        await logStringChange(id, String(form.get('date')), strings, {
          cost: Number(form.get('cost')) || undefined,
          notes: String(form.get('notes') || '') || undefined,
          reminderDate: String(form.get('reminder') || '') || undefined,
        });
        navigate(`/assets/${id}`);
      }}
    >
      <fieldset>
        <legend>Positions</legend>
        <div className="checks">
          {positions.map((position) => (
            <label key={position}>
              <input
                type="checkbox"
                checked={selected.includes(position)}
                onChange={(event) =>
                  setSelection(
                    event.target.checked
                      ? [...selected, position]
                      : selected.filter((value) => value !== position),
                  )
                }
              />
              {position}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Date
        <input type="date" name="date" defaultValue={today()} required />
      </label>
      <div className="prefill-actions" aria-label="Reuse string details">
        {entryOptions?.current.length ? (
          <button
            type="button"
            className="quiet"
            onClick={() => applySetup(entryOptions.current)}
          >
            Use current setup
          </button>
        ) : null}
        {usual?.strings.length ? (
          <button
            type="button"
            className="quiet"
            onClick={() => applySetup(usual.strings)}
          >
            Use usual setup
          </button>
        ) : null}
        {entryOptions?.recent.length ? (
          <button
            type="button"
            className="quiet"
            onClick={() => applySetup(entryOptions.recent)}
          >
            Use most recent entry
          </button>
        ) : null}
      </div>
      <Link className="text-button" to={`/assets/${id}`}>
        Skip current setup for now
      </Link>
      <StringRows
        positions={selected}
        drafts={visibleDrafts}
        suggestions={entryOptions?.suggestions || []}
        onChange={changeDraft}
        onCopyFirst={copyFirst}
      />
      <label>
        Total cost (optional)
        <input
          type="number"
          name="cost"
          min="0"
          step="0.01"
          inputMode="decimal"
        />
      </label>
      <label>
        Notes (optional)
        <textarea name="notes" />
      </label>
      <label>
        Remind me on (optional)
        <input type="date" name="reminder" />
      </label>
    </FormPage>
  );
}
