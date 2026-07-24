import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { formatDate } from '../../lib/dates';

export function RemindersPage() {
  const rows =
    useLiveQuery(() => db.reminders.orderBy('dueDate').toArray()) || [];
  return (
    <>
      <h1>Reminders</h1>
      <p>Gentle notes for what may need attention next.</p>
      {rows.map((reminder) => (
        <article className="reminder-row" key={reminder.id}>
          <div>
            <strong>{reminder.title}</strong>
            <small>{formatDate(reminder.dueDate)}</small>
          </div>
          <select
            value={reminder.status}
            onChange={(event) =>
              db.reminders.update(reminder.id, {
                status: event.target.value as typeof reminder.status,
              })
            }
          >
            <option>active</option>
            <option>completed</option>
            <option>dismissed</option>
          </select>
        </article>
      ))}
    </>
  );
}
