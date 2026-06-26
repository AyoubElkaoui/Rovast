"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/intern";

  const [wachtwoord, setWachtwoord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/intern/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wachtwoord }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Inloggen mislukt.");
        setBusy(false);
        return;
      }
      router.replace(next.startsWith("/intern") ? next : "/intern");
      router.refresh();
    } catch {
      setError("Kon geen verbinding maken met de server.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="wachtwoord"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Wachtwoord
        </label>
        <input
          type="password"
          id="wachtwoord"
          name="wachtwoord"
          autoFocus
          autoComplete="current-password"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
        />
      </div>
      <button
        type="submit"
        disabled={busy || wachtwoord.length === 0}
        className="inline-flex w-full items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
