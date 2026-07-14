import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import { config } from "./config.js";
import { listGoogleSheets } from "./data/googleSheets.js";
import { generateLeafletPdf } from "./pipeline/generate.js";

export function startTelegramBot(): Bot | null {
  if (!config.telegramBotToken) {
    console.log("Telegram bot disabled: TELEGRAM_BOT_TOKEN is empty");
    return null;
  }

  const bot = new Bot(config.telegramBotToken);

  bot.catch(err => {
    console.error("Telegram bot error:", err.error);
  });

  bot.command("start", async ctx => {
    if (!isAllowed(ctx.chat.id)) {
      console.log(`Telegram denied chat id: ${ctx.chat.id}`);
      return;
    }

    await safeReply(ctx, async () => {
      await replyWithSheetPicker(ctx);
    });
  });

  bot.callbackQuery("refresh:sheets", async ctx => {
    if (!ctx.chat || !isAllowed(ctx.chat.id)) return;

    await safeReply(ctx, async () => {
      await ctx.answerCallbackQuery({ text: "Обновляю список..." });
      await replyWithSheetPicker(ctx);
    });
  });

  bot.callbackQuery(/^sheet:(.+)$/, async ctx => {
    if (!ctx.chat || !isAllowed(ctx.chat.id)) return;

    await safeReply(ctx, async () => {
      const gid = ctx.match[1];
      const sheets = await listGoogleSheets();
      const sheet = sheets.find(item => item.gid === gid);
      const sheetTitle = sheet?.title || gid;

      await ctx.answerCallbackQuery({ text: "Собираю PDF..." });
      const status = await ctx.reply(`Генерация началась: ${sheetTitle}`);

      try {
        const result = await generateLeafletPdf({ gid, sheetTitle });
        await ctx.replyWithDocument(new InputFile(result.pdfPath, result.fileName), {
          caption: `Готово: ${result.leaflets.length} листовок`
        });
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, "PDF отправлен.");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, `Ошибка генерации: ${message}`);
      }
    });
  });

  if (config.telegramUsePolling) {
    void bot.api.deleteWebhook({ drop_pending_updates: false })
      .then(() => bot.start({
        onStart: info => {
          console.log(`Telegram bot started: @${info.username}`);
        }
      }))
      .catch(err => {
        console.error("Telegram bot start failed:", err);
      });
  }

  return bot;
}

async function replyWithSheetPicker(ctx: Context): Promise<void> {
  const sheets = await listGoogleSheets();
  const keyboard = new InlineKeyboard();

  for (const sheet of sheets.slice(0, 40)) {
    keyboard.text(sheet.title, `sheet:${sheet.gid}`).row();
  }

  keyboard.text("Обновить список", "refresh:sheets");

  await ctx.reply("Выбери лист Google таблицы:", { reply_markup: keyboard });
}

async function safeReply(ctx: Context, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Telegram request failed:", message);
    await ctx.reply(`Ошибка: ${message}`);
  }
}

function isAllowed(chatId: number): boolean {
  return config.telegramAllowedChatIds.size === 0 || config.telegramAllowedChatIds.has(chatId);
}
