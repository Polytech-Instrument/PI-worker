import qr from "qrcode-generator";
import { ProductGroup } from "../domain/types.js";
import { proxiedImageUrl } from "../data/images.js";
import { escapeHtml } from "../utils/html.js";
import { renderTemplate } from "./template.js";

export function renderProductCard(group: ProductGroup): string {
  return renderTemplate("ProductCard.html", {
    cardType: escapeHtml(group.cardType),
    image: renderImage(group),
    brand: escapeHtml(group.brandId || ""),
    title: escapeHtml(group.headerName),
    description: escapeHtml(group.descriptionText),
    discount: renderDiscount(group),
    surprise: renderSurprise(group),
    rows: renderRows(group),
    video: renderVideo(group)
  });
}

function renderImage(group: ProductGroup): string {
  if (!group.imageUrl) {
    return `<div class="product-card__image product-card__image--empty"></div>`;
  }

  return `<img class="product-card__image" src="${escapeHtml(proxiedImageUrl(group.imageUrl))}" alt="" />`;
}

function renderDiscount(group: ProductGroup): string {
  if (!group.discountText) return "";
  return `<div class="product-card__discount">${escapeHtml(group.discountText)}%</div>`;
}

function renderSurprise(group: ProductGroup): string {
  if (!group.surpriseText) return "";
  return `<div class="product-card__surprise">${escapeHtml(group.surpriseText)}</div>`;
}

function renderRows(group: ProductGroup): string {
  return group.items.map(item => `<tr>
    <td>${renderSku(group, item.sku)}</td>
    <td>${escapeHtml(item.specs)}</td>
    <td>${escapeHtml(item.min)}</td>
    <td>${escapeHtml(item.qty)}</td>
    <td><b>${escapeHtml(item.boxPrice || item.price)}</b></td>
  </tr>`).join("");
}

function renderSku(group: ProductGroup, sku: string): string {
  const text = escapeHtml(sku);
  if (!group.productUrl) return text;
  return `<a href="${escapeHtml(group.productUrl)}">${text}</a>`;
}

function renderVideo(group: ProductGroup): string {
  if (!group.videoUrl) return "";
  return `<div class="product-card__video">${renderQr(group.videoUrl)}<span>Смотрите видео</span></div>`;
}

function renderQr(url: string): string {
  const code = qr(0, "M");
  code.addData(url);
  code.make();
  return code.createSvgTag({ cellSize: 2, margin: 1 });
}
