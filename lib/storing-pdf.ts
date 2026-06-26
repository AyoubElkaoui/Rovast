import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export interface StoringData {
  datum: string;
  adres: string;
  telefoon: string;
  email: string;
  omschrijving: string;
  entiteit: string;
  offerte: "ja" | "nee";
  maxBedrag?: string;
  // "Door ons in te vullen" — intern
  werknummer?: string;
  monteur?: string;
  internDatum?: string;
  internTijd?: string;
}

// --- kleuren ---
const NAVY = rgb(0x1f / 255, 0x3a / 255, 0x5f / 255); // #1f3a5f
const GREY = rgb(0.42, 0.42, 0.46);
const BLACK = rgb(0.12, 0.12, 0.14);
const BAR_BG = rgb(0.92, 0.94, 0.97);
const LINE = rgb(0.84, 0.85, 0.88);

// --- afmetingen (A4 in punten) ---
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LABEL_W = 165;
const VALUE_X = MARGIN + LABEL_W;
const VALUE_W = CONTENT_W - LABEL_W;

// WinAnsi (Helvetica) kan deze code-points niet coderen.
const WINANSI_UNDEFINED = new Set([0x81, 0x8d, 0x8f, 0x90, 0x9d]);
const WINANSI_MAP: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
};

/** Vervang tekens die Helvetica/WinAnsi niet kan tekenen, zodat pdf-lib niet crasht. */
function sanitizeText(input: string): string {
  let out = "";
  for (const ch of String(input ?? "")) {
    if (ch === "\n") {
      out += ch;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32) {
      out += " ";
    } else if (code <= 0xff && !WINANSI_UNDEFINED.has(code)) {
      out += ch;
    } else if (ch in WINANSI_MAP) {
      out += WINANSI_MAP[ch];
    } else if (code === 0x20ac || code === 0x2013 || code === 0x2014) {
      // euro, en-dash en em-dash kan WinAnsi wél tekenen
      out += ch;
    } else {
      out += "?";
    }
  }
  return out;
}

/** Breek tekst over meerdere regels; respecteert handmatige newlines en breekt te lange woorden. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const result: string[] = [];
  const paragraphs = sanitizeText(text).replace(/\r/g, "").split("\n");

  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";

    for (let word of words) {
      // Breek een enkel woord dat breder is dan de kolom (bv. lange URL/e-mail).
      while (font.widthOfTextAtSize(word, size) > maxWidth) {
        let i = 1;
        while (
          i < word.length &&
          font.widthOfTextAtSize(word.slice(0, i + 1), size) <= maxWidth
        ) {
          i++;
        }
        const head = word.slice(0, i);
        if (line) {
          result.push(line);
          line = "";
        }
        result.push(head);
        word = word.slice(i);
      }

      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    result.push(line);
  }

  return result.length ? result : [""];
}

/** Maak een bestandsnaam met alleen letters/cijfers/_-. */
function sanitizeFilenamePart(value: string): string {
  return (
    String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // diakritische tekens weghalen
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "onbekend"
  );
}

export async function buildStoringPdf(
  data: StoringData,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 30) newPage();
  };

  // --- Header ---
  page.drawText("Reparatie- / storingsformulier", {
    x: MARGIN,
    y: y - 22,
    size: 20,
    font: fontBold,
    color: NAVY,
  });
  y -= 32;
  page.drawText("Elmar Services | Rovast", {
    x: MARGIN,
    y: y - 12,
    size: 11,
    font,
    color: GREY,
  });
  y -= 22;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_W, y },
    thickness: 2,
    color: NAVY,
  });
  y -= 22;

  // --- Sectiekop met lichte balk ---
  const drawSection = (title: string) => {
    ensure(40);
    y -= 4;
    page.drawRectangle({
      x: MARGIN,
      y: y - 22,
      width: CONTENT_W,
      height: 24,
      color: BAR_BG,
    });
    page.drawText(sanitizeText(title), {
      x: MARGIN + 10,
      y: y - 16,
      size: 11.5,
      font: fontBold,
      color: NAVY,
    });
    y -= 36;
  };

  // --- Label/waarde-rij ---
  const drawRow = (label: string, rawValue: string | undefined) => {
    const size = 10.5;
    const lineHeight = 14;
    const value =
      rawValue && rawValue.trim() !== "" ? rawValue : "—"; // em-dash voor leeg
    const lines = wrapText(value, font, size, VALUE_W);
    const blockHeight = lines.length * lineHeight;

    ensure(blockHeight + 12);
    const top = y;

    page.drawText(sanitizeText(label), {
      x: MARGIN,
      y: top - 10,
      size: 9.5,
      font,
      color: GREY,
    });
    lines.forEach((ln, i) => {
      page.drawText(ln, {
        x: VALUE_X,
        y: top - 10 - i * lineHeight,
        size,
        font,
        color: BLACK,
      });
    });

    y = top - blockHeight - 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_W, y },
      thickness: 0.5,
      color: LINE,
    });
    y -= 8;
  };

  // --- Sectie 1: Gegevens aanvraag ---
  drawSection("Gegevens aanvraag");
  drawRow("Datum", data.datum);
  drawRow("Adresgegevens reparatie", data.adres);
  drawRow("Telefoonnummer huurder", data.telefoon);
  drawRow("E-mailadres huurder", data.email);
  drawRow("Omschrijving storing", data.omschrijving);
  drawRow("Entiteit t.b.v. facturatie", data.entiteit);
  drawRow("Offerte gewenst", data.offerte === "ja" ? "Ja" : "Nee");
  drawRow("Max. bedrag zonder offerte", data.maxBedrag);

  // --- Sectie 2: Door ons in te vullen ---
  y -= 6;
  drawSection("Door ons in te vullen");
  drawRow("Werknummer", data.werknummer);
  drawRow("Monteur", data.monteur);
  drawRow("Datum", data.internDatum);
  drawRow("Tijd", data.internTijd);

  // --- Footer op elke pagina ---
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((p, idx) => {
    p.drawLine({
      start: { x: MARGIN, y: MARGIN },
      end: { x: MARGIN + CONTENT_W, y: MARGIN },
      thickness: 0.5,
      color: LINE,
    });
    p.drawText(
      sanitizeText("Reparatie- / storingsformulier — Elmar Services | Rovast"),
      {
        x: MARGIN,
        y: MARGIN - 14,
        size: 8,
        font,
        color: GREY,
      },
    );
    const pageLabel = `Pagina ${idx + 1} van ${total}`;
    const labelWidth = font.widthOfTextAtSize(pageLabel, 8);
    p.drawText(pageLabel, {
      x: MARGIN + CONTENT_W - labelWidth,
      y: MARGIN - 14,
      size: 8,
      font,
      color: GREY,
    });
  });

  const bytes = await doc.save();
  const filename = `Storingsmelding_${sanitizeFilenamePart(
    data.adres,
  )}_${sanitizeFilenamePart(data.datum)}.pdf`;

  return { bytes, filename };
}
