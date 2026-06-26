import ExcelJS from "exceljs";
import type { StoringData } from "./storing-pdf";

const NAVY = "FF1F3A5F"; // ARGB — huisstijl navy #1f3a5f

/** Bouw een .xlsx met alle velden van de melding (klant + intern). */
export async function buildStoringExcel(
  data: StoringData,
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Elmar Services | Rovast";
  const ws = wb.addWorksheet("Storingsmelding");

  ws.columns = [
    { header: "Veld", key: "veld", width: 32 },
    { header: "Waarde", key: "waarde", width: 70 },
  ];

  // Titelregel
  ws.mergeCells("A1:B1");
  const title = ws.getCell("A1");
  title.value = "Reparatie- / storingsformulier — Elmar Services | Rovast";
  title.font = { bold: true, size: 13, color: { argb: NAVY } };
  ws.getRow(1).height = 22;

  // Kopregel
  const head = ws.getRow(2);
  head.values = ["Veld", "Waarde"];
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
  });

  const rows: Array<[string, string]> = [
    ["Datum", data.datum],
    ["Adresgegevens reparatie", data.adres],
    ["Telefoonnummer huurder", data.telefoon],
    ["E-mailadres huurder", data.email],
    ["Omschrijving storing", data.omschrijving],
    ["Entiteit t.b.v. facturatie", data.entiteit],
    ["Offerte gewenst", data.offerte === "ja" ? "Ja" : "Nee"],
    ["Max. bedrag zonder offerte", data.maxBedrag || "—"],
    ["—  Door ons ingevuld  —", ""],
    ["Werknummer", data.werknummer || "—"],
    ["Monteur", data.monteur || "—"],
    ["Datum (intern)", data.internDatum || "—"],
    ["Tijd (intern)", data.internTijd || "—"],
  ];

  for (const [veld, waarde] of rows) {
    const row = ws.addRow({ veld, waarde });
    row.getCell("veld").font = { bold: true, color: { argb: NAVY } };
    row.getCell("waarde").alignment = { wrapText: true, vertical: "top" };
    if (veld.startsWith("—")) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEAEFF5" },
        };
      });
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
  const filename = `Storingsmelding_${sanitize(data.adres)}_${sanitize(
    data.datum,
  )}.xlsx`;

  return { buffer, filename };
}

function sanitize(value: string): string {
  return (
    String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "onbekend"
  );
}
