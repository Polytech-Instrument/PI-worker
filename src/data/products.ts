import fs from "node:fs/promises";
import { config } from "../config.js";
import { Product, ProductVariant } from "../domain/types.js";

export async function loadProducts(): Promise<Product[]> {
  const raw = await fs.readFile(config.productDbPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Product DB must be an array");
  return data as Product[];
}

export function buildSkuIndex(products: Product[]): Map<string, { product: Product; variant: ProductVariant }> {
  const index = new Map<string, { product: Product; variant: ProductVariant }>();
  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku = String(variant.sku || "").trim();
      if (sku && !index.has(sku)) index.set(sku, { product, variant });
    }
  }
  return index;
}

export function getVariantProperty(variant: ProductVariant, names: string[]): string {
  const normalized = names.map(normalizeProp);
  const found = (variant.properties || []).find(prop => normalized.includes(normalizeProp(prop.propertyname)));
  return found ? String(found.propertyvalue ?? "").trim() : "";
}

export function getFirstVideoUrl(product: Product): string {
  for (const variant of product.variants || []) {
    for (const prop of variant.properties || []) {
      if (!/видео/i.test(prop.propertyname)) continue;
      const url = extractUrl(String(prop.propertyvalue || ""));
      if (url) return url;
    }
  }
  return "";
}

function extractUrl(value: string): string {
  const src = /src=\\"([^"]+)\\"/i.exec(value) || /src="([^"]+)"/i.exec(value);
  if (src?.[1]) return src[1];
  const direct = /(https?:\/\/[^\s"'<>]+)/i.exec(value);
  return direct?.[1] || "";
}

function normalizeProp(value: string): string {
  return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, "");
}
