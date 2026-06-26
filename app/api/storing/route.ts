import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { buildStoringPdf, type StoringData } from "@/lib/storing-pdf";

export const runtime = "nodejs";

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
  // Sectie "Door ons in te vullen" — allemaal optioneel
  werknummer: z.string().trim().optional().default(""),
  monteur: z.string().trim().optional().default(""),
  internDatum: z.string().trim().optional().default(""),
  internTijd: z.string().trim().optional().default(""),
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

  // Honeypot gevuld → bot. Stil "OK" teruggeven zonder PDF/mail.
  if (data.website.trim() !== "") {
    return NextResponse.json({ ok: true, filename: "", pdf: "" });
  }

  // PDF genereren
  const pdfData: StoringData = {
    datum: data.datum,
    adres: data.adres,
    telefoon: data.telefoon,
    email: data.email,
    omschrijving: data.omschrijving,
    entiteit: data.entiteit,
    offerte: data.offerte,
    maxBedrag: data.maxBedrag,
    werknummer: data.werknummer,
    monteur: data.monteur,
    internDatum: data.internDatum,
    internTijd: data.internTijd,
  };

  let bytes: Uint8Array;
  let filename: string;
  try {
    ({ bytes, filename } = await buildStoringPdf(pdfData));
  } catch (err) {
    console.error("PDF genereren mislukt:", err);
    return NextResponse.json(
      { ok: false, error: "Kon de PDF niet genereren." },
      { status: 500 },
    );
  }

  const base64 = Buffer.from(bytes).toString("base64");

  // Mail versturen — mag de response NIET breken.
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.STORING_TO;
  const from =
    process.env.STORING_FROM ?? "Storingsformulier <onboarding@resend.dev>";

  if (apiKey && to) {
    try {
      const resend = new Resend(apiKey);
      const summary = [
        `Nieuwe storingsmelding via het formulier.`,
        ``,
        `Datum: ${data.datum}`,
        `Adres: ${data.adres}`,
        `Telefoon huurder: ${data.telefoon}`,
        `E-mail huurder: ${data.email}`,
        `Entiteit t.b.v. facturatie: ${data.entiteit}`,
        `Offerte gewenst: ${data.offerte === "ja" ? "Ja" : "Nee"}`,
        `Max. bedrag zonder offerte: ${data.maxBedrag || "—"}`,
        ``,
        `Omschrijving storing:`,
        data.omschrijving,
        ``,
        `De volledige melding zit als PDF in de bijlage.`,
      ].join("\n");

      const { error } = await resend.emails.send({
        from,
        to,
        replyTo: data.email,
        subject: `Storingsmelding — ${data.adres}`,
        text: summary,
        attachments: [{ filename, content: base64 }],
      });

      if (error) {
        console.error("Resend gaf een fout terug:", error);
      }
    } catch (err) {
      console.error("Mail versturen mislukt (response blijft geldig):", err);
    }
  } else {
    console.warn(
      "RESEND_API_KEY of STORING_TO ontbreekt — mail wordt overgeslagen, PDF-download werkt wel.",
    );
  }

  return NextResponse.json({ ok: true, filename, pdf: base64 });
}
