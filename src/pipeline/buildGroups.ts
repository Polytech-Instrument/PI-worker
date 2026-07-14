import { buildSkuIndex, getFirstVideoUrl, getVariantProperty } from "../data/products.js";
import { normalizeLeafletName } from "../domain/promo.js";
import { Product, ProductGroup, PromoType, SheetRow } from "../domain/types.js";
import { ProductRemoteMeta } from "../data/images.js";

export function buildProductGroups(
  products: Product[],
  rows: SheetRow[],
  promoType: PromoType,
  remoteMeta: Map<string, ProductRemoteMeta>
): ProductGroup[] {
  const skuIndex = buildSkuIndex(products);
  const rowsBySku = new Map(rows.map(row => [row.sku, row]));
  const grouped = new Map<string, ProductGroup>();

  for (const row of rows.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const match = skuIndex.get(row.sku);
    if (!match) continue;

    const productKey = String(match.product.id || match.product.title || row.sku);
    const mainSku = String(match.product.variants?.[0]?.sku || row.sku);
    const rowMeta = remoteMeta.get(row.sku) || remoteMeta.get(mainSku) || {};

    let group = grouped.get(productKey);
    if (!group) {
      const mainRow = rowsBySku.get(mainSku) || row;
      const isBox = promoType === "box";
      group = {
        cardType: isBox ? "box" : "default",
        mainSku,
        headerName: match.product.title,
        descriptionText: match.product.description || match.variant.productdescription || "",
        brandId: match.product.brand ? String(match.product.brand) : "",
        leafletName: normalizeLeafletName(row.leafletName || row.groupName),
        discountText: isBox ? calculateBoxDiscount(mainRow.basePrice, mainRow.boxPrice) : mainRow.discount,
        discountInfoText: mainRow.conditions,
        surpriseText: detectGiftText(mainRow.conditions),
        boxPriceText: mainRow.boxPrice,
        boxQtyText: mainRow.multiplicity,
        productUrl: rowMeta.productUrl,
        imageUrl: rowMeta.imageUrl,
        videoUrl: getFirstVideoUrl(match.product),
        items: []
      };
      grouped.set(productKey, group);
    }

    group.items.push({
      sku: row.sku,
      specs: match.variant.specs || "",
      min: String(getVariantProperty(match.variant, ["Минимальное количество"]) || match.variant.min || ""),
      qty: String(getVariantProperty(match.variant, ["Количество в упаковке"]) || match.variant.qty || ""),
      price: row.boxPrice || row.basePrice || String(match.variant.price || ""),
      discount: row.discount,
      boxPrice: row.boxPrice,
      multiplicity: row.multiplicity
    });
  }

  return [...grouped.values()];
}

function detectGiftText(value?: string): string {
  const text = String(value || "").toLowerCase();
  const match = /кажд(?:ая|ый|ое)?\s*(\d+)[-\s]*(?:я|й|е)?\s*(?:в\s*)?подарок/i.exec(text);
  return match ? `каждая ${match[1]}-я в подарок` : "";
}

function calculateBoxDiscount(basePrice?: string, boxPrice?: string): string {
  const base = parsePrice(basePrice);
  const box = parsePrice(boxPrice);
  if (!base || !box || box >= base) return "";
  return String(Math.round((1 - box / base) * 100));
}

function parsePrice(value?: string): number | null {
  const normalized = String(value || "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
