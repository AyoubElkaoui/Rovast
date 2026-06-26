import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatAdres } from "@/lib/storing-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nederlandse postcode: 4 cijfers (eerste niet 0) + 2 letters, spatie optioneel.
const POSTCODE_RE = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;
// NL telefoon na het strippen van spaties/streepjes/haakjes: +31 / 0031 / 0 + 9 cijfers.
const TELEFOON_RE = /^(\+31|0031|0)[1-9][0-9]{8}$/;

// Alleen klantvelden — het interne blok wordt later via /intern aangevuld.
const storingSchema = z.object({
  datum: z.string().trim().min(1, "Datum is verplicht"),
  straat: z.string().trim().min(1, "Straatnaam is verplicht"),
  huisnummer: z
    .string()
    .trim()
    .min(1, "Huisnummer is verplicht")
    .regex(/^[0-9]/, "Huisnummer moet met een cijfer beginnen"),
  postcode: z
    .string()
    .trim()
    .regex(POSTCODE_RE, "Vul een geldige postcode in, bijv. 1234 AB")
    // Normaliseer naar "1234 AB" (hoofdletters, één spatie).
    .transform((v) => {
      const c = v.replace(/\s+/g, "").toUpperCase();
      return `${c.slice(0, 4)} ${c.slice(4)}`;
    }),
  plaats: z.string().trim().min(1, "Plaats is verplicht"),
  telefoon: z
    .string()
    .trim()
    .min(1, "Telefoonnummer is verplicht")
    .refine(
      (v) => TELEFOON_RE.test(v.replace(/[\s\-().]/g, "")),
      "Vul een geldig Nederlands telefoonnummer in, bijv. 06 12345678",
    ),
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
        straat: data.straat,
        huisnummer: data.huisnummer,
        postcode: data.postcode,
        plaats: data.plaats,
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
        `Adres: ${formatAdres(data)}`,
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
              ["Adres", formatAdres(data)],
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
        subject: `Nieuwe storingsmelding — ${formatAdres(data)}`,
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
