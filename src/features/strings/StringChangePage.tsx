import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '../../components/FormPage';
import { StringRows } from '../../components/StringRows';
import { db, today } from '../../db';
import { logStringChange } from '../../services';
import { POSITIONS } from '../../types';

export function StringChangePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const asset = useLiveQuery(() => db.assets.get(id), [id]);
  const usual = useLiveQuery(() => db.usualSetups.get(id), [id]);
  const positions = asset
    ? asset.instrumentFamily === 'other'
      ? asset.customPositions || []
      : POSITIONS[asset.instrumentFamily || 'violin']
    : [];
  const [selection, setSelection] = useState<string[] | null>(null);
  const selected = selection ?? positions;
  if (!asset) return null;
  return (
    <FormPage
      title="Log string change"
      intro="Choose one string or the full set. Each position can keep its own product."
      onSubmit={async (form) => {
        const strings = selected.map((position) => ({
          position,
          brand: String(form.get(`brand-${position}`)),
          model: String(form.get(`model-${position}`)),
          tensionOrGauge:
            String(form.get(`gauge-${position}`) || '') || undefined,
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
      {usual && (
        <button
          type="button"
          className="quiet"
          onClick={() => {
            usual.strings.forEach((string) => {
              const brand = document.querySelector<HTMLInputElement>(
                `[name="brand-${string.position}"]`,
              );
              const model = document.querySelector<HTMLInputElement>(
                `[name="model-${string.position}"]`,
              );
              if (brand) brand.value = string.brand;
              if (model) model.value = string.model;
            });
            setSelection(usual.strings.map((string) => string.position));
          }}
        >
          Use usual setup
        </button>
      )}
      <Link className="text-button" to={`/assets/${id}`}>
        Skip current setup for now
      </Link>
      <StringRows positions={selected} />
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
