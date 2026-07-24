import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { formatDate } from '../../lib/dates';
import { deleteEvent, updateEvent } from '../../services';
import type { MaintenanceEvent } from '../../types';

export function EventCard({ event }: { event: MaintenanceEvent }) {
  const [open, setOpen] = useState(false);
  const strings =
    useLiveQuery(
      () =>
        db.installations.where('maintenanceEventId').equals(event.id).toArray(),
      [event.id],
    ) || [];
  return (
    <article>
      <button className="event-summary" onClick={() => setOpen(!open)}>
        <span>
          <strong>
            {event.workType || event.eventType.replaceAll('-', ' ')}
          </strong>
          <small>
            {strings.length
              ? strings.map((string) => string.position).join(', ')
              : event.provider || ''}
          </small>
        </span>
        <time>{formatDate(event.date)}</time>
      </button>
      {open && (
        <div className="event-detail">
          <p>
            {event.notes || 'No notes'}
            {event.cost !== undefined && ` · $${event.cost.toFixed(2)}`}
          </p>
          <button
            onClick={async () => {
              const notes = prompt('Update notes', event.notes || '');
              if (notes !== null) await updateEvent(event.id, { notes });
            }}
          >
            Edit notes
          </button>
          <button
            onClick={async () => {
              if (
                confirm(
                  'Delete this event? Historical string changes with later replacements are protected.',
                )
              )
                try {
                  await deleteEvent(event.id);
                } catch (error) {
                  alert((error as Error).message);
                }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
