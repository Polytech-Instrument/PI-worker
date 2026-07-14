import { LeafletRun } from "../domain/types.js";
import { escapeHtml } from "../utils/html.js";
import { renderTemplate } from "./template.js";

export function renderBanner(run: LeafletRun): string {
  const title = run.promoType === "box"
    ? "Акция коробкой дешевле!"
    : run.promoType === "fixed"
      ? "Фиксированные цены"
      : "Подборка акционных товаров";
  const description = run.promoType === "box"
    ? "Специальные цены при заказе кратно коробкам."
    : `Более ${Math.floor(run.groups.length / 10) * 10 || run.groups.length} акционных товаров.`;

  return renderTemplate("Banner.html", {
    promoType: escapeHtml(run.promoType),
    eyebrow: escapeHtml(run.title),
    title: escapeHtml(title),
    description: escapeHtml(description)
  });
}
