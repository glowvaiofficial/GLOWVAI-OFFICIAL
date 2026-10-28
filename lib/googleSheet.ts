import { AdminLead } from "@/lib/adminData";

/**
 * Read-only access to the public GLOW VAI face-scan leads sheet.
 * This sheet is shared as "Anyone with the link - Viewer", so this fetch
 * carries no secret. Writes still go exclusively through the Apps Script
 * webapp in lib/storage/index.ts, server-side only.
 */
const LEADS_SHEET_ID = "1Y0u2bGrrwGPmoZWKi_lY6OgzDy91XTEeo1srXCLEXio";

type GvizCell = { v: unknown; f?: string } | null;

function parseGvizResponse(raw: string): { cols: { label: string }[]; rows: { c: GvizCell[] }[] } {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Unexpected sheet response format");
  const json = JSON.parse(raw.slice(start, end + 1));
  return json.table;
}

function cellText(cell: GvizCell): string {
  if (!cell) return "";
  if (cell.f !== undefined && cell.f !== null) return String(cell.f);
  if (cell.v === null || cell.v === undefined) return "";
  return String(cell.v);
}

export async function fetchLeadsFromSheet(): Promise<AdminLead[]> {
  const url = `https://docs.google.com/spreadsheets/d/${LEADS_SHEET_ID}/gviz/tq?tqx=out:json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status})`);
  const raw = await res.text();
  const table = parseGvizResponse(raw);

  return table.rows.map((row, idx) => {
    const [timestamp, ip, location, browser, os, name, phone, email, skin_concern, image_url, image_id] =
      row.c.map(cellText);
    return {
      rowIndex: idx + 2, // +2: header row + 1-indexing, matches the sheet row number
      timestamp,
      ip,
      location,
      browser,
      os,
      name,
      phone,
      email,
      skin_concern,
      image_url,
      image_id,
    };
  });
}
