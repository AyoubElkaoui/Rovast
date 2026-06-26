import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internGuard } from "@/lib/intern-auth";
import { buildStoringExcel } from "@/lib/storing-excel";
import type { StoringData } from "@/lib/storing-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await internGuard();
  if (denied) return denied;

  const { id } = await params;
  const m = await prisma.storing.findUnique({ where: { id } });
  if (!m) {
    return NextResponse.json(
      { ok: false, error: "Melding niet gevonden." },
      { status: 404 },
    );
  }

  const data: StoringData = {
    datum: m.datum,
    straat: m.straat,
    huisnummer: m.huisnummer,
    postcode: m.postcode,
    plaats: m.plaats,
    telefoon: m.telefoon,
    email: m.email,
    omschrijving: m.omschrijving,
    entiteit: m.entiteit,
    offerte: m.offerte === "ja" ? "ja" : "nee",
    maxBedrag: m.maxBedrag ?? "",
    werknummer: m.werknummer ?? "",
    monteur: m.monteur ?? "",
    internDatum: m.internDatum ?? "",
    internTijd: m.internTijd ?? "",
  };

  const { buffer, filename } = await buildStoringExcel(data);

  return new NextResponse(new Blob([new Uint8Array(buffer)]), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
