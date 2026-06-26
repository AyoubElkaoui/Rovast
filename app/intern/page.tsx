import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireInternPage } from "@/lib/intern-auth";
import { formatAdres } from "@/lib/storing-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InternIndexPage() {
  await requireInternPage("/intern");

  const meldingen = await prisma.storing.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-navy px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold text-white">
              Storingsmeldingen
            </h1>
            <p className="mt-1 text-sm text-slate-200">Elmar Services | Rovast</p>
          </div>
          <form action="/api/intern/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Uitloggen
            </button>
          </form>
        </div>

        <div className="p-6">
          {meldingen.length === 0 ? (
            <p className="text-sm text-slate-600">Nog geen meldingen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Ontvangen</th>
                    <th className="py-2 pr-4 font-semibold">Adres</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {meldingen.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-3 pr-4 text-slate-600">
                        {m.createdAt.toLocaleString("nl-NL", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 pr-4 text-slate-900">
                        {formatAdres(m)}
                      </td>
                      <td className="py-3 pr-4">
                        {m.internAangevuld ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Aangevuld
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Nieuw
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/intern/${m.id}`}
                          className="font-semibold text-navy hover:underline"
                        >
                          Openen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
