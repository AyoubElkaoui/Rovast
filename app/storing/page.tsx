"use client";

import { useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

interface ApiResponse {
  ok: boolean;
  id?: string;
  error?: string;
  issues?: Record<string, string[]>;
}

function todayIso(): string {
  const now = new Date();
  const tz = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tz).toISOString().slice(0, 10);
}

export default function StoringPage() {
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [reference, setReference] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setState("submitting");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/storing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.ok) {
        setState("error");
        setErrorMsg(
          data.error ?? "Er ging iets mis bij het verzenden. Probeer opnieuw.",
        );
        return;
      }

      setReference(data.id ?? "");
      setState("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setState("error");
      setErrorMsg(
        "Kon geen verbinding maken met de server. Controleer je internet en probeer opnieuw.",
      );
    }
  }

  function handleNew() {
    setReference("");
    setState("idle");
    setErrorMsg("");
  }

  if (state === "success") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="rounded-t-xl border-b border-slate-200 bg-navy px-6 py-5">
            <h1 className="text-xl font-semibold text-white">
              Storingsmelding ontvangen
            </h1>
            <p className="mt-1 text-sm text-slate-200">
              Bedankt. Je melding is geregistreerd en wordt in behandeling
              genomen.
            </p>
          </div>

          <div className="space-y-4 p-6">
            {reference && (
              <p className="text-sm text-slate-600">
                Referentie:{" "}
                <span className="font-mono font-medium text-slate-900">
                  {reference}
                </span>
              </p>
            )}
            <p className="text-sm text-slate-600">
              Je hoeft verder niets te doen. Wij nemen indien nodig contact met
              je op via de opgegeven gegevens.
            </p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Nieuwe melding
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-navy px-6 py-6">
          <h1 className="text-2xl font-semibold text-white">
            Reparatie- / storingsformulier
          </h1>
          <p className="mt-1 text-sm text-slate-200">Elmar Services | Rovast</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 p-6" noValidate>
          {state === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {/* Honeypot — verborgen voor mensen, lokt bots. */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="website">Website (niet invullen)</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* --- Sectie: klantgegevens --- */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-navy">
              Gegevens aanvraag
            </h2>

            <Field label="Datum" htmlFor="datum" required>
              <input
                type="date"
                id="datum"
                name="datum"
                required
                defaultValue={todayIso()}
                className={inputClass}
              />
            </Field>

            <Field label="Adresgegevens reparatie" htmlFor="adres" required>
              <textarea
                id="adres"
                name="adres"
                required
                rows={3}
                placeholder="Straat, huisnummer, postcode, plaats"
                className={inputClass}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Telefoonnummer huurder" htmlFor="telefoon" required>
                <input
                  type="tel"
                  id="telefoon"
                  name="telefoon"
                  required
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>

              <Field label="E-mailadres huurder" htmlFor="email" required>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Omschrijving storing" htmlFor="omschrijving" required>
              <textarea
                id="omschrijving"
                name="omschrijving"
                required
                rows={4}
                placeholder="Beschrijf de storing zo duidelijk mogelijk"
                className={inputClass}
              />
            </Field>

            <Field label="Entiteit t.b.v. facturatie" htmlFor="entiteit" required>
              <input
                type="text"
                id="entiteit"
                name="entiteit"
                required
                className={inputClass}
              />
            </Field>

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-700">
                Offerte gewenst <span className="text-red-500">*</span>
              </legend>
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="offerte"
                    value="ja"
                    required
                    className="h-4 w-4 accent-navy"
                  />
                  Ja
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="offerte"
                    value="nee"
                    className="h-4 w-4 accent-navy"
                  />
                  Nee
                </label>
              </div>
            </fieldset>

            <Field
              label="Max. bedrag zonder offerte"
              htmlFor="maxBedrag"
              hint="Optioneel"
            >
              <input
                type="text"
                id="maxBedrag"
                name="maxBedrag"
                inputMode="decimal"
                placeholder="Bijv. € 250,-"
                className={inputClass}
              />
            </Field>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={state === "submitting"}
              className="inline-flex items-center justify-center rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "submitting" ? "Bezig met verzenden…" : "Verzenden"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20";

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700"
      >
        <span>
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        {hint && (
          <span className="text-xs font-normal text-slate-400">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}
