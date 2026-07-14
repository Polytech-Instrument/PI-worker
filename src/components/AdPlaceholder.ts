import { renderTemplate } from "./template.js";

export function renderAdPlaceholder(mode: "column" | "full"): string {
  return renderTemplate("AdPlaceholder.html", { mode });
}
