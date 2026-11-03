# AGENTS.md

Arabic-first bookstore (الغزال للكتب): static storefront + dependency-free Node/SQLite backend.

## Commands

- `npm start` — serve storefront, admin, and API on `PORT` (default 3000). No watch mode.
- `npm test` — all `node:test` tests.
- `node --test test/api.test.js` — one test file.
- `node --test --test-name-pattern="stock" test/api.test.js` — one test.
- `npm run admin:reset -- owner@example.com 'newpassword'` — reset/create owner.
- `npm run backup` — SQLite + cover backup folder in `.data/backups` (`GHAZAL_BACKUP_DIR` overrides).
- `node scripts/create-book-import-template.js` — regenerate the XLSX import template.
- `python3 scripts/append_ecotrack_orders.py orders.json --output orders.xlsx` — append orders to the Ecotrack workbook.

No install step: there are zero npm dependencies, and no lint/format/typecheck/build config. Do not add a bundler/framework for small changes.

Requires Node >= 22.5 (`node:sqlite` `DatabaseSync`). On Node 22.5–22.12, run with `--experimental-sqlite`; Node 22.13+ needs no flag.

## Environment

- `GHAZAL_DATA_DIR` — SQLite location (default `.data/ghazal.sqlite`). `.data/` is gitignored; never commit it.
- `GHAZAL_COVERS_DIR` — cover files (default `<GHAZAL_DATA_DIR>/covers`). Also outside the repo; back it up with the database.
- `GHAZAL_ADMIN_PASSWORD` / `GHAZAL_ADMIN_EMAIL` — create owner on first start (signup then closes). Signup/API require 12+ characters; `admin:reset` accepts 10+.
- `FORCE_HTTPS=true`, `META_PIXEL_ID`, `META_ACCESS_TOKEN`, `META_GRAPH_VERSION`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — optional production integrations; keep tokens server-side.
- Opening `index.html` directly (`file:`) uses a localStorage fallback. Full checkout/admin/order lookup require `npm start`.

## Architecture

- `server.js` is the entire backend: schema + idempotent migrations, catalog reset gate, all `/api/*` routes, and static file serving. There is no router or ORM — add endpoints inside the single `api()` dispatch block and use `db.prepare(...)`.
- `server.js` mutates the DB at require time (opens DB, runs migrations, may apply the one-time catalog reset, may create owner from env). Set `GHAZAL_DATA_DIR` (and test env) **before** `require('../server')`, or tests/scripts will touch the real database.
- The catalog starts empty by design. Books, publishers, authors, categories, and subcategories come from XLSX imports; `/api/admin/catalog` derives publishers/authors/`genres`/`bookGenres` from the books it receives. `resetCatalogOnce()` is gated by `store_content.catalogReset` version `2026-11-clean-slate` and keeps orders, order items, users, and discounts while clearing the catalog.
- Do not `require('../server')` from backup/maintenance scripts: it runs the startup mutations. `scripts/backup-db.js` copies files directly for this reason.
- Frontend is plain scripts, no build: `script.js` storefront, `admin.js` dashboard, `api.js` exposes `window.GhazalAPI`. Load order is fixed in `index.html` / `admin.html`.
- Admin sessions use a Bearer token in `sessionStorage` (`ghazal.adminToken`), not a cookie. Authorization is permission-based (`owner` vs `admin`). Collections, exports, conversions, and diagnostics are owner-role-only; staff management uses the `manage_staff` permission (owner by default).
- Order lifecycle is server-authoritative: creation reserves stock; `confirmed` settles reservations into physical stock; `cancelled` releases; `returned` restocks. Use `transitionOrder` / the restock endpoint rather than editing `books.stock` directly.
- Prices are integer DZD; shipping is computed from `deliveryRates`, never trusted from the client. Phones must match `0[5-7]\d{8}` and communes must belong to the selected wilaya.
- Data duplication to keep in sync when changing defaults: storefront and admin no longer ship demo books, publishers, categories, or collections — all catalog metadata comes from `/api/catalog`. Communes exist as both `data/algeria-communes-58-wilayas.json` (server/tests) and `.js` (`window.GHAZAL_COMMUNES`, browser). The 58-wilaya dataset is intentional for Ecotrack.
- Ecotrack: `assets/templates/upload_ecotrack_v31.xlsx` is the untouched supplied template; export appends rows to it. Don't rewrite the template in place.
- Covers are content-addressed files in `GHAZAL_COVERS_DIR`, served at `/covers/<sha256>.<ext>` with immutable caching. `books.image` holds that short path (originals); `books.thumb`/`books.display` hold pre-generated derivatives used by cards and the book page. Import uploads via `POST /api/admin/covers` (`{dataUrl}`, `{url}`, or `{original,thumb,display}`). Never inline `data:image/...` covers in the catalog again: it bloats every read/write and breaks bulk imports. Embedded covers from old databases migrate automatically at startup (`migrateEmbeddedCovers`).
- Static assets are cached for 24h; `script.js`, `admin.js`, `dashboard.css`, and `theme-white.css` carry `?v=...` query strings in the HTML. Bump the matching version when editing them, or changes may not show.
- Unknown static paths fall back to `index.html` (SPA behavior), so a missing asset returns HTML rather than 404.

## Conventions and tests

- All user-facing copy is Arabic and RTL; keep new UI strings Arabic. Currency formatting uses Latin digits (`ar-DZ-u-nu-latn`).
- Tests use a temp DB and insert 12 deterministic fixture books after `require('../server')` (the production catalog starts empty), with stock 10 and fixed prices. Changing fixture books/prices/stock or the API surface will break assertions in `test/api.test.js`; update tests deliberately.
- `test/surface.test.js` regex-checks exact selectors, CSS media queries, and discovery files in the source text. Renaming checkout fields, shelf classes, or markup markers requires updating it.
- Meta CAPI dedupe and one-time stock settlement are covered by tests; preserve idempotency when changing those paths.
