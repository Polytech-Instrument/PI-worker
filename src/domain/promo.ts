import { PromoType, SheetRow } from "./types.js";

export function detectPromoType(sheetName: string, rows: SheetRow[]): PromoType {
  const name = normalize(sheetName);
  if (name.includes("короб")) return "box";
  if (name.includes("фикс")) return "fixed";
  if (rows.some(row => row.boxPrice || row.multiplicity)) return "box";
  return "common";
}

export function normalizeLeafletName(value?: string | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeKey(value: string): string {
  return normalize(value).replace(/[^a-zа-я0-9]+/gi, "");
}

function normalize(value: string): string {
  return String(value || "").toLowerCase().replace(/ё/g, "е").trim();
}
