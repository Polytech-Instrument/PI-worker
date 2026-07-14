import fs from "node:fs";
import path from "node:path";

export function renderTemplate(name: string, values: Record<string, unknown>): string {
  const template = readTemplate(name);
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(values[key] ?? ""));
}

export function readComponentCss(): string {
  return readTemplate("styles.css");
}

function readTemplate(name: string): string {
  const filePath = path.join(process.cwd(), "src", "components", "templates", name);
  return fs.readFileSync(filePath, "utf8");
}
