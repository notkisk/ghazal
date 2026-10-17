# الغزال للكتب

An Arabic-first bookstore with a static preview and a dependency-free Node/SQLite backend. For the production flow, set `GHAZAL_ADMIN_PASSWORD` (and optionally `GHAZAL_ADMIN_EMAIL`) then run `npm start`; the server serves the storefront and persists orders/inventory in `.data/ghazal.sqlite`.

The catalog has twelve books with real Arabic-edition cover images. Cover source listings are documented in [`assets/covers/SOURCES.md`](assets/covers/SOURCES.md). The production catalog, publishers, genres, discounts, author profiles, featured ordering, and collections are stored in SQLite; browser storage is only an offline-preview fallback.

On a fresh database, open `/admin.html` and choose “إنشاء حساب المالك لأول مرة”. The first account becomes the owner and signup closes immediately after creation. Use a password of at least 12 characters. For scripted deployments, set `GHAZAL_ADMIN_PASSWORD` and optionally `GHAZAL_ADMIN_EMAIL` before starting the server; this also creates the owner account and disables first-run signup.

The basket remains local for resilience, but checkout posts to the backend when served through `server.js`. Orders use SQLite transactions and stock reservations: confirmation settles physical stock, cancellation releases an open reservation, and returns create an auditable restock. Checkout validates Algerian phone numbers, wilaya/commune pairs, shipment type, and stock on the server. Admin access uses expiring sessions, and audit events are recorded for order changes, deletion, stock changes, and exports. Public order lookup returns status history only; customer and address data remain admin-only. When served by `server.js`, the storefront reads `/api/catalog` and the owner dashboard writes catalog changes through `/api/admin/catalog`; the browser-only `index.html` preview falls back to local storage when opened directly from disk.

For Meta server-side purchase events, configure `META_PIXEL_ID`, `META_ACCESS_TOKEN`, and optionally `META_GRAPH_VERSION` in the server environment. Never put the access token in browser storage or frontend code.

For instant order alerts on a phone, create a Telegram bot with `@BotFather`, start a chat with that bot, find the destination chat ID, then configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the server. Each new order sends a formatted message with the reference, customer, delivery location, ordered books, quantities, and total. The bot token stays server-side. Telegram requires the recipient to start the bot first before it can send a private message. See the [official Telegram Bot API](https://core.telegram.org/bots/api) and [BotFather tutorial](https://core.telegram.org/bots/tutorial).

The Ecotrack exporter preserves the supplied workbook template and validates the generated rows before download. Configure a real deployment with HTTPS, a strong admin password, backups for `.data/`, and the merchant's current delivery rates before accepting live orders.

### Backups and monitoring

Create a point-in-time SQLite backup with `npm run backup`. Set `GHAZAL_BACKUP_DIR` to store backups outside `.data`, and schedule this command with cron or your hosting provider. The public health check is `GET /api/health`; owners can inspect integration and error diagnostics from `GET /api/admin/diagnostics`.

### Production deployment

Run the Node process behind a reverse proxy such as Caddy or nginx, terminate TLS at the proxy, and set `FORCE_HTTPS=true` so forwarded HTTP requests redirect to HTTPS. Set `GHAZAL_DATA_DIR` to a persistent disk, configure `GHAZAL_ADMIN_PASSWORD`, and schedule `npm run backup` at least daily. Keep `.data/` out of the public web root and restrict access to `/admin.html` at the proxy if the deployment has an additional access-control layer. The storefront uses `https://alghazal.books/` as its canonical and sitemap origin; change those values in `index.html`, `robots.txt`, and `sitemap.xml` if the real domain differs.
