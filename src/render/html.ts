import { LeafletRun, ProductGroup } from "../domain/types.js";
import { renderBanner } from "../components/Banner.js";
import { renderProductCard } from "../components/ProductCard.js";
import { renderGiftBlock } from "../components/GiftBlock.js";
import { renderAdPlaceholder } from "../components/AdPlaceholder.js";
import { renderPaginator } from "../components/Paginator.js";
import { renderFooter } from "../components/Footer.js";
import { readComponentCss } from "../components/template.js";
import { escapeHtml } from "../utils/html.js";

const PAGE_CAPACITY = 8;

export function renderDocumentHtml(runs: LeafletRun[]): string {
  const body = runs.flatMap(run => renderLeafletRun(run)).join("\n");
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Политех Верстальщик</title>
  <style>${readComponentCss()}</style>
</head>
<body>${body}</body>
</html>`;
}

function renderLeafletRun(run: LeafletRun): string[] {
  const pages: string[] = [];
  const startsOnSecondPage = run.promoType === "common";

  if (startsOnSecondPage) {
    pages.push(renderPage({
      title: run.title,
      pageNumber: 1,
      header: `${renderBanner(run)}${renderGiftBlock()}`,
      columns: "",
      footer: ""
    }));
  }

  const chunks = chunk(run.groups, PAGE_CAPACITY);
  chunks.forEach((groups, index) => {
    const pageNumber = startsOnSecondPage ? index + 2 : index + 1;
    pages.push(renderPage({
      title: run.title,
      pageNumber,
      header: run.promoType === "box" && pageNumber === 1 ? `${renderBanner(run)}<div class="box-notice">BOX HEADER NOTICE</div>` : "",
      columns: renderColumns(groups),
      footer: index === chunks.length - 1 ? `${renderAdPlaceholder("full")}${renderFooter(run)}` : "",
      paginator: run.promoType === "common" ? renderPaginator(run.title, pageNumber) : ""
    }));
  });

  return pages;
}

function renderColumns(groups: ProductGroup[]): string {
  const split = Math.ceil(groups.length / 2);
  const left = groups.slice(0, split).map(renderProductCard).join("");
  const right = groups.slice(split).map(renderProductCard).join("");
  return `<div class="columns"><div class="column">${left}${renderAdPlaceholder("column")}</div><div class="column">${right}${renderAdPlaceholder("column")}</div></div>`;
}

function renderPage(input: {
  title: string;
  pageNumber: number;
  header?: string;
  columns?: string;
  footer?: string;
  paginator?: string;
}): string {
  return `<section class="page" data-title="${escapeHtml(input.title)}" data-page="${input.pageNumber}">
    ${input.paginator || ""}
    ${input.header || ""}
    ${input.columns || ""}
    ${input.footer || ""}
  </section>`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}
