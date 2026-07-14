import { LeafletRun } from "../domain/types.js";
import { escapeHtml } from "../utils/html.js";
import { renderTemplate } from "./template.js";

export function renderFooter(run: LeafletRun): string {
  return renderTemplate("Footer.html", {
    title: escapeHtml(run.title)
  });
}
