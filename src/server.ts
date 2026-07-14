import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { listGoogleSheets } from "./data/googleSheets.js";
import { generateLeafletPdf } from "./pipeline/generate.js";

export function createServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/files", express.static(config.outputDir));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/sheets", async (_req, res, next) => {
    try {
      const sheets = await listGoogleSheets();
      res.json({ ok: true, sheets });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/generate", async (req, res, next) => {
    try {
      const result = await generateLeafletPdf({
        gid: req.body?.gid,
        sheetTitle: req.body?.sheetTitle
      });
      res.json({
        ok: true,
        id: result.id,
        fileName: result.fileName,
        leaflets: result.leaflets.map(run => ({
          title: run.title,
          promoType: run.promoType,
          products: run.groups.length
        })),
        pdfUrl: `${config.publicBaseUrl}/files/${path.basename(result.pdfPath)}`
      });
    } catch (err) {
      next(err);
    }
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  });

  return app;
}
