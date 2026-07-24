import { useState, type ReactNode } from 'react';

interface FormPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
}

export function FormPage({ title, intro, children, onSubmit }: FormPageProps) {
  const [saving, setSaving] = useState(false);

  return (
    <section className="form-page">
      <p className="eyebrow">Journal entry</p>
      <h1>{title}</h1>
      {intro && <p>{intro}</p>}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSubmit(new FormData(event.currentTarget));
          setSaving(false);
        }}
      >
        {children}
        <button className="button" disabled={saving}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </section>
  );
}
