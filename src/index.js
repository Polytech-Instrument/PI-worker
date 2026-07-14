import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { Bot, InlineKeyboard } from "grammy";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const TEMPLATES = path.join(SRC, "templates");
const PRODUCTS_PATH = path.join(SRC, "allProducts.json");

const PORT = Number(process.env.PORT || 3080);
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ALLOWED_CHAT_IDS = parseAllowedChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.type("text").send([
    "Политех Верстальщик Web",
    "",
    "GET /health",
    "GET /api/sheets",
    "GET /api/data?gid=1785866604&title=Тест",
    "GET /preview?gid=1785866604&title=Тест&limit=10",
    "",
    "Данные выбранного листа падают в консоль сервера.",
    "Первые карточки для верстки открываются через /preview."
  ].join("\n"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/sheets", async (_req, res, next) => {
  try {
    const sheets = await getSheets();
    console.log("Google sheets:", sheets);
    res.json({ ok: true, sheets });
  } catch (err) {
    next(err);
  }
});

app.get("/api/data", async (req, res, next) => {
  try {
    const gid = String(req.query.gid || "");
    const title = String(req.query.title || gid);
    const data = await buildDebugData({ gid, title });
    logData(data);
    res.json({ ok: true, summary: data.summary });
  } catch (err) {
    next(err);
  }
});

app.get("/preview", async (req, res, next) => {
  try {
    const gid = String(req.query.gid || "");
    const title = String(req.query.title || gid);
    const limit = Number(req.query.limit || 10);
    const data = await buildDebugData({ gid, title });
    logData(data);
    res.type("html").send(renderPreviewPage(data, limit));
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: err instanceof Error ? err.message : String(err)
  });
});

app.listen(PORT, () => {
  console.log(`Web generator: http://localhost:${PORT}`);
});

startBot().catch(err => {
  console.error("Telegram bot failed:", err);
});

async function startBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot disabled: TELEGRAM_BOT_TOKEN is empty");
    return;
  }

  const bot = new Bot(TELEGRAM_BOT_TOKEN);

  bot.catch(err => {
    console.error("Telegram error:", err.error);
  });

  bot.command("start", async ctx => {
    if (!isAllowed(ctx.chat.id)) {
      console.log(`Telegram denied chat id: ${ctx.chat.id}`);
      return;
    }

    const sheets = await getSheets();
    const keyboard = new InlineKeyboard();

    for (const sheet of sheets.slice(0, 40)) {
      keyboard.text(sheet.title, `sheet:${sheet.gid}`).row();
    }

    await ctx.reply("Выбери лист:", { reply_markup: keyboard });
  });

  bot.callbackQuery(/^sheet:(.+)$/, async ctx => {
    if (!ctx.chat || !isAllowed(ctx.chat.id)) return;

    const gid = ctx.match[1];
    await ctx.answerCallbackQuery({ text: "Загружаю данные..." });

    try {
      const sheets = await getSheets();
      const sheet = sheets.find(item => item.gid === gid);
      const data = await buildDebugData({ gid, title: sheet?.title || gid });
      logData(data);
      await ctx.reply(formatTelegramSummary(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Ошибка: ${message}`);
    }
  });

  try {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Telegram deleteWebhook failed, trying polling anyway: ${message}`);
  }

  try {
    await bot.start({
      onStart: info => console.log(`Telegram bot started: @${info.username}`)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Telegram polling failed: ${message}`);
    console.warn("Server is still running. Check internet/VPN/proxy access to api.telegram.org.");
  }
}

async function buildDebugData({ gid, title }) {
  if (!gid) throw new Error("gid is required");

  const [csvText, products] = await Promise.all([
    getCsv(gid),
    loadProducts()
  ]);

  const rows = parseTable(csvText);
  const productIndex = buildProductIndex(products);
  const mappedRows = rows
    .map(row => mapSheetRow(row))
    .filter(row => row.sku);

  const preview = mappedRows.slice(0, 30).map(row => {
    const product = productIndex.get(normalizeSku(row.sku));
    const variant = product?.variants?.find(item => normalizeSku(item.sku) === normalizeSku(row.sku));
    return {
      ...row,
      matched: Boolean(product),
      productTitle: product?.title || "",
      productDescription: product?.description || variant?.productdescription || "",
      brand: product?.brand || "",
      specs: variant?.specs || "",
      min: readVariantProperty(variant, "Минимальное количество") || variant?.min || "",
      qty: readVariantProperty(variant, "Количество в упаковке") || variant?.qty || "",
      variantsCount: product?.variants?.length || 0
    };
  });

  const matchedCount = mappedRows.filter(row => productIndex.has(normalizeSku(row.sku))).length;
  const missingSkus = mappedRows
    .filter(row => !productIndex.has(normalizeSku(row.sku)))
    .map(row => row.sku);

  const leaflets = countBy(mappedRows.map(row => row.leafletName || "Без листовки"));

  return {
    ok: true,
    summary: {
      sheetTitle: title,
      gid,
      jsonProducts: products.length,
      csvRows: rows.length,
      rowsWithSku: mappedRows.length,
      matchedProducts: matchedCount,
      missingProducts: missingSkus.length,
      missingSkus: missingSkus.slice(0, 50),
      leaflets
    },
    preview,
    rows: mappedRows
  };
}

function renderPreviewPage(data, limit) {
  const cards = data.preview
    .slice(0, limit)
    .map(renderPreviewCard)
    .join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.summary.sheetTitle)} - первые карточки</title>
  <style>${readTemplate("style.css")}</style>
</head>
<body>
  <main class="preview-page">
    <header class="preview-header">
      <div>Первые карточки: ${escapeHtml(data.summary.sheetTitle)}</div>
      <div>${data.preview.length} из ${data.summary.rowsWithSku}</div>
    </header>
    <section class="preview-grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
}

function renderPreviewCard(item) {
  return renderTemplate("ProductCard.html", {
    image: `<div class="product-card__image-placeholder">${escapeHtml(item.sku)}</div>`,
    brand: escapeHtml(item.brand),
    title: escapeHtml(item.productTitle || item.csvTitle),
    description: escapeHtml(item.productDescription || item.csvTitle),
    rows: renderTemplate("ProductRow.html", {
      sku: escapeHtml(item.sku),
      specs: escapeHtml(item.specs || item.csvTitle),
      min: escapeHtml(item.min),
      qty: escapeHtml(item.qty),
      price: escapeHtml(item.basePrice)
    })
  });
}

async function getSheets() {
  assertGoogle();
  const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=sheets`);
  if (!res.ok) throw new Error(`Google sheets HTTP ${res.status}`);

  const json = await res.json();
  const list = Array.isArray(json)
    ? json
    : Array.isArray(json.value)
      ? json.value
      : Array.isArray(json.sheets)
        ? json.sheets
        : [];

  return list
    .map(item => ({
      gid: String(item.gid ?? item.id ?? ""),
      title: String(item.title ?? item.name ?? "")
    }))
    .filter(item => item.gid && item.title);
}

async function getCsv(gid) {
  assertGoogle();
  const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=csv&gid=${encodeURIComponent(gid)}`);
  if (!res.ok) throw new Error(`Google csv HTTP ${res.status}`);
  return res.text();
}

async function loadProducts() {
  const text = await fs.promises.readFile(PRODUCTS_PATH, "utf8");
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : Object.values(json);
}

function buildProductIndex(products) {
  const index = new Map();

  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku = normalizeSku(variant.sku || variant.code || variant.article);
      if (sku) index.set(sku, product);
    }
  }

  return index;
}

function mapSheetRow(row) {
  return {
    sku: getByAliases(row, ["код", "sku", "артикул"]),
    csvTitle: getByAliases(row, ["номенклатура", "название", "товар"]),
    discount: getByAliases(row, ["скидка без условий", "скидка"]),
    conditions: getByAliases(row, ["условия"]),
    basePrice: getByAliases(row, ["базовая цена", "цена"]),
    leafletName: getByAliases(row, ["название листовки", "листовка"]),
    groupName: getByAliases(row, ["группа товара", "категория"]),
    order: getByAliases(row, ["порядок"])
  };
}

function parseTable(text) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(text, delimiter).filter(row => row.some(Boolean));
  if (rows.length === 0) return [];

  const headerIndex = findHeaderRowIndex(rows);
  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || "";
    });
    return item;
  });
}

function findHeaderRowIndex(rows) {
  const index = rows.findIndex(row => {
    const headers = row.map(normalizeHeader);
    return headers.includes("код") || headers.includes("sku") || headers.includes("артикул");
  });

  return index >= 0 ? index : 0;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);
  return rows;
}

function getByAliases(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key]) return row[key];
  }
  return "";
}

function countBy(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSku(value) {
  return String(value || "").trim();
}

function readVariantProperty(variant, name) {
  const property = variant?.properties?.find(item => {
    return normalizeHeader(item.propertyname) === normalizeHeader(name);
  });
  return property?.propertyvalue || "";
}

function renderTemplate(name, values) {
  return readTemplate(name).replace(/\{\{(\w+)\}\}/g, (_match, key) => String(values[key] ?? ""));
}

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assertGoogle() {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error("GOOGLE_SCRIPT_URL is empty");
  }
}

function parseAllowedChatIds(value) {
  return new Set(
    value
      .split(",")
      .map(item => Number(item.trim()))
      .filter(Number.isFinite)
  );
}

function isAllowed(chatId) {
  return TELEGRAM_ALLOWED_CHAT_IDS.size === 0 || TELEGRAM_ALLOWED_CHAT_IDS.has(chatId);
}

function logData(data) {
  const dumpPath = path.join(ROOT, "output", "last-data.json");
  fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2), "utf8");

  console.log("\n================ GOOGLE SHEET DATA ================");
  console.log(JSON.stringify(data.summary, null, 2));
  console.log("\n--- PREVIEW ROWS ---");
  console.log(JSON.stringify(data.preview, null, 2));
  console.log(`\nFull data saved: ${dumpPath}`);
  console.log("===================================================\n");
}

function formatTelegramSummary(data) {
  const lines = [
    `Лист: ${data.summary.sheetTitle}`,
    `CSV строк: ${data.summary.csvRows}`,
    `Строк с SKU: ${data.summary.rowsWithSku}`,
    `Товаров в JSON: ${data.summary.jsonProducts}`,
    `Совпало с JSON: ${data.summary.matchedProducts}`,
    `Не найдено в JSON: ${data.summary.missingProducts}`,
    "",
    "Листовки:"
  ];

  for (const [name, count] of Object.entries(data.summary.leaflets)) {
    lines.push(`- ${name}: ${count}`);
  }

  if (data.summary.missingSkus.length) {
    lines.push("", `Первые отсутствующие SKU: ${data.summary.missingSkus.join(", ")}`);
  }

  lines.push("", "Подробные данные выведены в консоль сервера.");
  return lines.join("\n");
}
