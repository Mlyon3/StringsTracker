import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '../../components/FormPage';
import { db, today } from '../../db';
import { logMaintenance } from '../../services';

export function MaintenancePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const asset = useLiveQuery(() => db.assets.get(id), [id]);
  if (!asset) return null;
  const bow = asset.profileType === 'bow';
  return (
    <FormPage
      title={`Log ${bow ? 'bow' : 'instrument'} maintenance`}
      onSubmit={async (form) => {
        const work = String(form.get('work'));
        const type = bow
          ? work === 'Rehair'
            ? 'bow-rehair'
            : 'bow-repair'
          : work === 'Appraisal'
            ? 'appraisal'
            : work === 'Structural repair'
              ? 'instrument-repair'
              : 'instrument-adjustment';
        await logMaintenance(id, type, work, String(form.get('date')), {
          provider: String(form.get('provider') || '') || undefined,
          cost: Number(form.get('cost')) || undefined,
          notes: String(form.get('notes') || '') || undefined,
          reminderDate: String(form.get('reminder') || '') || undefined,
        });
        navigate(`/assets/${id}`);
      }}
    >
      <label>
        Work performed
        <select name="work">
          {(bow
            ? [
                'Rehair',
                'Re-wrap',
                'Tip repair',
                'Camber adjustment',
                'Other bow work',
              ]
            : [
                'Routine adjustment',
                'Soundpost adjustment',
                'Bridge work',
                'Structural repair',
                'Setup change',
                'Appraisal',
                'Other',
              ]
          ).map((work) => (
            <option key={work}>{work}</option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input name="date" type="date" defaultValue={today()} required />
      </label>
      <label>
        Provider
        <input name="provider" />
      </label>
      <label>
        Cost
        <input name="cost" type="number" step="0.01" min="0" />
      </label>
      <label>
        Notes
        <textarea name="notes" />
      </label>
      <label>
        Reminder date
        <input name="reminder" type="date" />
      </label>
    </FormPage>
  );
}
