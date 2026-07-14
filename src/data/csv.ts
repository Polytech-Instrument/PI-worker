import { SheetRow } from "../domain/types.js";
import { normalizeKey } from "../domain/promo.js";

type ColumnMap = {
  code?: number;
  title?: number;
  discount?: number;
  conditions?: number;
  basePrice?: number;
  leafletName?: number;
  groupName?: number;
  order?: number;
  boxPrice?: number;
  multiplicity?: number;
};

export function parseSheetCsv(csv: string): SheetRow[] {
  const rows = parseDelimited(csv);
  if (rows.length === 0) return [];
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalizeKey);
  const columns = mapColumns(headers);
  if (columns.code === undefined) return [];

  return rows.slice(headerIndex + 1)
    .map(rawRow => rowToObject(rawRow, rows[headerIndex]))
    .map((raw, index) => toSheetRow(raw, rows[headerIndex], columns, index))
    .filter((row): row is SheetRow => !!row && !!row.sku);
}

function parseDelimited(text: string): string[][] {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted && ch === '"' && next === '"') {
      cell += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }

  row.push(cell);
  out.push(row);
  return out.filter(item => item.some(cellValue => String(cellValue || "").trim()));
}

function findHeaderIndex(rows: string[][]): number {
  return rows.findIndex(row => row.map(normalizeKey).some(cell => cell === "код"));
}

function mapColumns(headers: string[]): ColumnMap {
  const byName = new Map(headers.map((name, index) => [name, index]));
  const find = (...names: string[]) => names.map(normalizeKey).map(name => byName.get(name)).find(index => index !== undefined);
  return {
    code: find("код"),
    title: find("номенклатура"),
    discount: find("скидка без условий", "скидка"),
    conditions: find("условия"),
    basePrice: find("базовая цена", "цена"),
    leafletName: find("название листовки", "листовка"),
    groupName: find("группа товара"),
    order: find("порядок"),
    boxPrice: find("спец цена", "спеццена", "цена коробкой", "замещающая скидка от базовой кратно коробкам"),
    multiplicity: find("кратность", "кратно", "коробка", "количество в коробке")
  };
}

function rowToObject(row: string[], headers: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header, index) => {
    obj[header] = String(row[index] || "").trim();
  });
  return obj;
}

function toSheetRow(raw: Record<string, string>, headers: string[], columns: ColumnMap, index: number): SheetRow | null {
  const get = (column?: number) => column === undefined ? "" : String(raw[headers[column]] || "").trim();
  const sku = get(columns.code);
  if (!sku) return null;
  return {
    sku,
    title: get(columns.title),
    discount: get(columns.discount),
    conditions: get(columns.conditions),
    basePrice: get(columns.basePrice),
    leafletName: get(columns.leafletName),
    groupName: get(columns.groupName),
    order: Number(get(columns.order)) || index + 1,
    boxPrice: get(columns.boxPrice),
    multiplicity: get(columns.multiplicity),
    raw
  };
}
