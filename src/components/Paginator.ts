import { escapeHtml } from "../utils/html.js";
import { renderTemplate } from "./template.js";

export function renderPaginator(title: string, pageNumber: number): string {
  return renderTemplate("Paginator.html", {
    title: escapeHtml(title),
    pageNumber
  });
}
