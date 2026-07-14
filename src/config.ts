import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();

export const config = {
  port: Number(process.env.PORT || 3080),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3080}`,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramAllowedChatIds: parseAllowedChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS || ""),
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  telegramUsePolling: String(process.env.TELEGRAM_USE_POLLING || "true").toLowerCase() === "true",
  googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || "",
  defaultGoogleGid: process.env.DEFAULT_GOOGLE_GID || "",
  productDbPath: path.resolve(rootDir, process.env.PRODUCT_DB_PATH || "../Figma-plugins/allProducts.json"),
  outputDir: path.resolve(rootDir, process.env.OUTPUT_DIR || "./output"),
  productImageEndpoint: process.env.PRODUCT_IMAGE_ENDPOINT || "https://ptech.ru/getproductimage.php",
  imageProxyBase: process.env.IMAGE_PROXY_BASE || "https://figma-proxy-1.onrender.com/img?url="
};

function parseAllowedChatIds(value: string): Set<number> {
  return new Set(
    value
      .split(",")
      .map(item => Number(item.trim()))
      .filter(Number.isFinite)
  );
}
