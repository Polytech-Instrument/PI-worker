import { config } from "./config.js";
import { createServer } from "./server.js";
import { startTelegramBot } from "./bot.js";

const app = createServer();
startTelegramBot();

app.listen(config.port, () => {
  console.log(`Web generator listening on ${config.port}`);
});
