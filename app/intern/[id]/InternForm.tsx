"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InternFields {
  werknummer: string;
  monteur: string;
  internDatum: string;
  internTijd: string;
}

export default function InternForm({
  id,
  initial,
}: {
  id: string;
  initial: InternFields;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<InternFields>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof InternFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/intern/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Kon geen verbinding maken met de server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg bg-slate-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-navy">
        Door ons in te vullen
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Alleen zichtbaar voor Elmar. Sla op voordat je downloadt.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Werknummer">
            <input
              type="text"
              value={fields.werknummer}
              onChange={(e) => update("werknummer", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Monteur">
            <input
              type="text"
              value={fields.monteur}
              onChange={(e) => update("monteur", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Datum">
            <input
              type="date"
              value={fields.internDatum}
              onChange={(e) => update("internDatum", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tijd">
            <input
              type="time"
              value={fields.internTijd}
              onChange={(e) => update("internTijd", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
          {saved && (
            <span className="text-sm font-medium text-green-700">
              Opgeslagen ✓
            </span>
          )}

          <span className="ml-auto flex gap-2">
            <a
              href={`/api/intern/${id}/pdf`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Download PDF
            </a>
            <a
              href={`/api/intern/${id}/excel`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Download Excel
            </a>
          </span>
        </div>
      </form>
    </section>
  );
}

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
