import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { internGuard } from "@/lib/intern-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const internSchema = z.object({
  werknummer: z.string().trim().optional().default(""),
  monteur: z.string().trim().optional().default(""),
  internDatum: z.string().trim().optional().default(""),
  internTijd: z.string().trim().optional().default(""),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await internGuard();
  if (denied) return denied;

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag." },
      { status: 400 },
    );
  }

  const parsed = internSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Ongeldige invoer." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  try {
    await prisma.storing.update({
      where: { id },
      data: {
        werknummer: d.werknummer || null,
        monteur: d.monteur || null,
        internDatum: d.internDatum || null,
        internTijd: d.internTijd || null,
        internAangevuld: true,
      },
    });
  } catch (err) {
    console.error("Bijwerken interne velden mislukt:", err);
    return NextResponse.json(
      { ok: false, error: "Melding niet gevonden of opslaan mislukt." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
