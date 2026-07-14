# Политех Web Generator

Отдельная web/backend-версия генератора листовок.

Цель: нажать кнопку в Telegram-боте и получить готовый PDF в ответ.

## Что Уже Есть

- Express API.
- Telegram bot на grammY.
- Загрузка Google Sheets через Apps Script endpoint.
- Парсинг CSV/TSV.
- Загрузка встроенной базы товаров из `../Figma-plugins/allProducts.json`.
- Сопоставление SKU таблицы с товарной базой.
- Определение типа акции: обычная, коробочная, фикс.
- Разбивка обычной акции на общую и отдельные листовки.
- Получение фото, ссылки товара и категории через текущий endpoint.
- HTML-render pipeline.
- PDF export через Playwright.
- Компоненты-заглушки под будущую ручную верстку:
  - `Banner`
  - `ProductCard`
  - `GiftBlock`
  - `AdPlaceholder`
  - `Paginator`
  - `Footer`

## Структура

```text
web-generator/
  src/
    components/       HTML-компоненты, сюда переносить реальную верстку
    data/             Google Sheets, CSV, продукты, фото
    domain/           типы и правила акции
    pipeline/         сборка товаров и листовок
    render/           HTML и PDF export
    bot.ts            Telegram bot
    server.ts         HTTP API
    index.ts          входная точка
  output/             готовые HTML/PDF
```

## Настройка

```powershell
cd C:\Users\Anton\Documents\Figma\web-generator
copy .env.example .env
npm.cmd install
npx.cmd playwright install chromium
```

Заполнить `.env`:

```env
TELEGRAM_BOT_TOKEN=...
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
DEFAULT_GOOGLE_GID=...
PRODUCT_DB_PATH=../Figma-plugins/allProducts.json
```

Если бот должен отвечать только тебе:

```env
TELEGRAM_ALLOWED_CHAT_IDS=123456789
```

## Запуск

```powershell
npm.cmd run dev
```

Проверка API:

```http
GET /health
POST /api/generate
```

Тело `POST /api/generate`:

```json
{
  "gid": "123456789",
  "sheetTitle": "Июль акция"
}
```

Ответ:

```json
{
  "ok": true,
  "pdfUrl": "http://localhost:3080/files/....pdf"
}
```

## Telegram Flow

1. Написать боту `/start`.
2. Нажать кнопку `Создать листовки PDF`.
3. Бот запускает pipeline.
4. Бот отправляет PDF документом.

## Где Верстать

Основные файлы для будущего дизайна:

```text
src/components/Banner.ts
src/components/ProductCard.ts
src/components/GiftBlock.ts
src/components/AdPlaceholder.ts
src/components/Paginator.ts
src/components/Footer.ts
```

Сейчас это HTML-заглушки. Их можно заменить на нормальную верстку без переписывания pipeline.

## Важный Момент

Это не Figma-render. PDF собирается из HTML/CSS через Playwright.

Поэтому дизайн надо будет переносить в web-компоненты:

- размеры A4;
- сетка колонок;
- карточки;
- баннеры;
- футеры;
- QR;
- рекламные блоки.

Плюс такого подхода: генерацию можно запускать на сервере, из Telegram, по webhook, по расписанию и без открытой Figma.
