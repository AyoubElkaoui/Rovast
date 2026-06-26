import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alleen klantvelden — het interne blok wordt later via /intern aangevuld.
const storingSchema = z.object({
  datum: z.string().trim().min(1, "Datum is verplicht"),
  adres: z.string().trim().min(1, "Adresgegevens zijn verplicht"),
  telefoon: z.string().trim().min(1, "Telefoonnummer is verplicht"),
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  omschrijving: z.string().trim().min(1, "Omschrijving is verplicht"),
  entiteit: z.string().trim().min(1, "Entiteit is verplicht"),
  offerte: z.enum(["ja", "nee"], {
    errorMap: () => ({ message: "Geef aan of een offerte gewenst is" }),
  }),
  maxBedrag: z.string().trim().optional().default(""),
  // Honeypot — moet leeg blijven
  website: z.string().optional().default(""),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag." },
      { status: 400 },
    );
  }

  const parsed = storingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Niet alle verplichte velden zijn (correct) ingevuld.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot gevuld → bot. Stil "OK" zonder op te slaan/mailen.
  if (data.website.trim() !== "") {
    return NextResponse.json({ ok: true, id: "" });
  }

  // 1) Opslaan in de database
  let id: string;
  try {
    const rec = await prisma.storing.create({
      data: {
        datum: data.datum,
        adres: data.adres,
        telefoon: data.telefoon,
        email: data.email,
        omschrijving: data.omschrijving,
        entiteit: data.entiteit,
        offerte: data.offerte,
        maxBedrag: data.maxBedrag || null,
      },
    });
    id = rec.id;
  } catch (err) {
    console.error("Opslaan in database mislukt:", err);
    return NextResponse.json(
      { ok: false, error: "Kon de melding niet opslaan. Probeer later opnieuw." },
      { status: 500 },
    );
  }

  // 2) Interne aanvullink bepalen (override via APP_BASE_URL, anders huidige origin)
  const baseUrl =
    process.env.APP_BASE_URL?.replace(/\/+$/, "") || new URL(req.url).origin;
  const internUrl = `${baseUrl}/intern/${id}`;

  // 3) Mail naar Elmar (mag de response NIET breken)
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.STORING_TO;
  const from =
    process.env.STORING_FROM ?? "Storingsformulier <onboarding@resend.dev>";

  if (apiKey && to) {
    try {
      const resend = new Resend(apiKey);
      const text = [
        "Er is een nieuwe storingsmelding binnengekomen.",
        "",
        `Datum: ${data.datum}`,
        `Adres: ${data.adres}`,
        `Telefoon huurder: ${data.telefoon}`,
        `E-mail huurder: ${data.email}`,
        `Entiteit t.b.v. facturatie: ${data.entiteit}`,
        `Offerte gewenst: ${data.offerte === "ja" ? "Ja" : "Nee"}`,
        `Max. bedrag zonder offerte: ${data.maxBedrag || "—"}`,
        "",
        "Omschrijving storing:",
        data.omschrijving,
        "",
        "Open de melding om het interne blok aan te vullen en PDF/Excel te downloaden:",
        internUrl,
      ].join("\n");

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:600px">
          <h2 style="color:#1f3a5f;margin:0 0 4px">Nieuwe storingsmelding</h2>
          <p style="color:#64748b;margin:0 0 16px">Elmar Services | Rovast</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px">
            ${[
              ["Datum", data.datum],
              ["Adres", data.adres],
              ["Telefoon huurder", data.telefoon],
              ["E-mail huurder", data.email],
              ["Entiteit t.b.v. facturatie", data.entiteit],
              ["Offerte gewenst", data.offerte === "ja" ? "Ja" : "Nee"],
              ["Max. bedrag zonder offerte", data.maxBedrag || "—"],
            ]
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">${esc(
                    k,
                  )}</td><td style="padding:4px 0">${esc(v)}</td></tr>`,
              )
              .join("")}
          </table>
          <p style="margin:16px 0 4px;color:#64748b;font-size:14px">Omschrijving storing</p>
          <p style="margin:0 0 20px;white-space:pre-wrap;font-size:14px">${esc(
            data.omschrijving,
          )}</p>
          <a href="${internUrl}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Melding openen &amp; aanvullen</a>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">${internUrl}</p>
        </div>`;

      const { error } = await resend.emails.send({
        from,
        to,
        replyTo: data.email,
        subject: `Nieuwe storingsmelding — ${data.adres}`,
        text,
        html,
      });

      if (error) {
        console.error("Resend gaf een fout terug:", error);
      }
    } catch (err) {
      console.error("Mail versturen mislukt (response blijft geldig):", err);
    }
  } else {
    console.warn(
      "RESEND_API_KEY of STORING_TO ontbreekt — mail wordt overgeslagen (melding is wel opgeslagen).",
    );
  }

  return NextResponse.json({ ok: true, id });
}
