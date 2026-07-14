import { config } from "../config.js";

export type GoogleSheetInfo = {
  gid: string;
  title: string;
};

export async function listGoogleSheets(): Promise<GoogleSheetInfo[]> {
  assertGoogleConfigured();
  const response = await fetch(`${config.googleScriptUrl}?action=sheets`);
  if (!response.ok) throw new Error(`Google sheets HTTP ${response.status}`);
  const json = await response.json();
  return normalizeSheets(json);
}

export async function fetchGoogleCsv(gid: string): Promise<string> {
  assertGoogleConfigured();
  const response = await fetch(`${config.googleScriptUrl}?action=csv&gid=${encodeURIComponent(gid)}`);
  if (!response.ok) throw new Error(`Google csv HTTP ${response.status}`);
  return response.text();
}

function normalizeSheets(value: unknown): GoogleSheetInfo[] {
  const list = Array.isArray(value)
    ? value
    : Array.isArray((value as any)?.value)
      ? (value as any).value
      : Array.isArray((value as any)?.sheets)
        ? (value as any).sheets
        : [];

  return list
    .map((item: any) => ({
      gid: String(item.gid ?? item.id ?? ""),
      title: String(item.title ?? item.name ?? "")
    }))
    .filter(item => item.gid && item.title);
}

function assertGoogleConfigured() {
  if (!config.googleScriptUrl) {
    throw new Error("GOOGLE_SCRIPT_URL is not configured");
  }
}
