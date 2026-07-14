import { config } from "../config.js";

export type ProductRemoteMeta = {
  imageUrl?: string;
  productUrl?: string;
  category?: string;
};

export async function fetchProductMetaBatch(skus: string[]): Promise<Map<string, ProductRemoteMeta>> {
  const clean = [...new Set(skus.map(sku => String(sku || "").trim()).filter(Boolean))];
  if (clean.length === 0) return new Map();

  const response = await fetch(config.productImageEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articles: clean })
  });

  if (!response.ok) return new Map();
  const json = await response.json() as any;
  const data = json?.data || {};
  const map = new Map<string, ProductRemoteMeta>();
  for (const sku of clean) {
    const entry = data[sku] || {};
    map.set(sku, {
      imageUrl: normalizeUrl(entry.image || ""),
      productUrl: normalizeUrl(entry.url || entry.productUrl || ""),
      category: entry.category || ""
    });
  }
  return map;
}

export function proxiedImageUrl(url?: string): string {
  if (!url) return "";
  if (!config.imageProxyBase) return url;
  return `${config.imageProxyBase}${encodeURIComponent(url)}`;
}

function normalizeUrl(value: string): string {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}
