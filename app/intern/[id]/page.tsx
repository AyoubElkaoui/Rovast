import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInternPage } from "@/lib/intern-auth";
import { formatAdres } from "@/lib/storing-pdf";
import InternForm from "./InternForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireInternPage(`/intern/${id}`);

  const m = await prisma.storing.findUnique({ where: { id } });
  if (!m) notFound();

  const klant: Array<[string, string]> = [
    ["Datum", m.datum],
    ["Straat en huisnummer", `${m.straat} ${m.huisnummer}`.trim()],
    ["Postcode en plaats", `${m.postcode} ${m.plaats}`.trim()],
    ["Telefoonnummer huurder", m.telefoon],
    ["E-mailadres huurder", m.email],
    ["Omschrijving storing", m.omschrijving],
    ["Entiteit t.b.v. facturatie", m.entiteit],
    ["Offerte gewenst", m.offerte === "ja" ? "Ja" : "Nee"],
    ["Max. bedrag zonder offerte", m.maxBedrag || "—"],
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4">
        <Link href="/intern" className="text-sm text-navy hover:underline">
          ← Terug naar overzicht
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-navy px-6 py-5">
          <h1 className="text-lg font-semibold text-white">
            Storingsmelding — {formatAdres(m)}
          </h1>
          <p className="mt-1 text-sm text-slate-200">
            Elmar Services | Rovast · referentie{" "}
            <span className="font-mono">{m.id}</span>
          </p>
        </div>

        <div className="space-y-6 p-6">
          {/* Klantgegevens (alleen-lezen) */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy">
              Gegevens aanvraag
            </h2>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {klant.map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {k}
                  </dt>
                  <dd className="whitespace-pre-wrap text-sm text-slate-900 sm:col-span-2">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Interne invulvelden + downloads */}
          <InternForm
            id={m.id}
            initial={{
              werknummer: m.werknummer ?? "",
              monteur: m.monteur ?? "",
              internDatum: m.internDatum ?? "",
              internTijd: m.internTijd ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
