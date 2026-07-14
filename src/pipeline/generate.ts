import crypto from "node:crypto";
import { config } from "../config.js";
import { fetchGoogleCsv, listGoogleSheets } from "../data/googleSheets.js";
import { fetchProductMetaBatch } from "../data/images.js";
import { loadProducts } from "../data/products.js";
import { parseSheetCsv } from "../data/csv.js";
import { detectPromoType } from "../domain/promo.js";
import { GenerationResult } from "../domain/types.js";
import { buildProductGroups } from "./buildGroups.js";
import { buildLeafletRuns } from "./leaflets.js";
import { renderDocumentHtml } from "../render/html.js";
import { writeHtmlAndPdf } from "../render/pdf.js";

export type GenerateOptions = {
  gid?: string;
  sheetTitle?: string;
};

export async function generateLeafletPdf(options: GenerateOptions = {}): Promise<GenerationResult> {
  const gid = options.gid || config.defaultGoogleGid || await resolveFirstSheetGid();
  if (!gid) throw new Error("No Google gid provided");

  const [products, csv] = await Promise.all([
    loadProducts(),
    fetchGoogleCsv(gid)
  ]);

  const rows = parseSheetCsv(csv);
  if (rows.length === 0) throw new Error("No rows parsed from Google sheet");

  const sheetTitle = options.sheetTitle || await resolveSheetTitle(gid);
  const promoType = detectPromoType(sheetTitle, rows);
  const remoteMeta = await fetchProductMetaBatch(rows.map(row => row.sku));
  const groups = buildProductGroups(products, rows, promoType, remoteMeta);
  if (groups.length === 0) throw new Error("No products matched embedded catalog");

  const leaflets = buildLeafletRuns(sheetTitle, groups, promoType);
  const html = renderDocumentHtml(leaflets);
  const id = crypto.randomUUID();
  const written = await writeHtmlAndPdf({
    html,
    id,
    outputDir: config.outputDir,
    fileNameBase: `ptech-${sheetTitle || gid}`
  });

  return {
    id,
    pdfPath: written.pdfPath,
    htmlPath: written.htmlPath,
    fileName: written.fileName,
    leaflets
  };
}

async function resolveFirstSheetGid(): Promise<string> {
  const sheets = await listGoogleSheets();
  return sheets[0]?.gid || "";
}

async function resolveSheetTitle(gid: string): Promise<string> {
  try {
    const sheets = await listGoogleSheets();
    return sheets.find(sheet => sheet.gid === gid)?.title || gid;
  } catch {
    return gid;
  }
}
