import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

export async function writeHtmlAndPdf(input: {
  html: string;
  outputDir: string;
  id: string;
  fileNameBase: string;
}): Promise<{ htmlPath: string; pdfPath: string; fileName: string }> {
  await fs.mkdir(input.outputDir, { recursive: true });
  const safeBase = sanitizeFileName(input.fileNameBase || "leaflets");
  const htmlPath = path.join(input.outputDir, `${input.id}-${safeBase}.html`);
  const pdfPath = path.join(input.outputDir, `${input.id}-${safeBase}.pdf`);
  await fs.writeFile(htmlPath, input.html, "utf8");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(input.html, { waitUntil: "networkidle" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }

  return {
    htmlPath,
    pdfPath,
    fileName: `${safeBase}.pdf`
  };
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
