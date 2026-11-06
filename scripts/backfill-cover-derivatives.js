/* Backfill cover derivatives (thumb/display) for books imported before the
 * importer started generating them.
 *
 * Books only carry `image` (the original file), so every card and shelf ships
 * the full-size cover. This script re-creates the same 400px / 1000px WebP
 * derivatives the admin importer produces, stores them as content-addressed
 * files through `/api/admin/covers`, and attaches them to the books with
 * `/api/admin/covers/backfill`. Originals are never modified.
 *
 * How to run:
 *   1. Open /admin.html and sign in as owner (or staff with edit_catalog).
 *   2. Open DevTools -> Console.
 *   3. Paste this whole file, press Enter, and leave the tab open.
 *
 * Optional switches, set before pasting:
 *   window.GHAZAL_BACKFILL_DRY_RUN = true   // only list books, change nothing
 *   window.GHAZAL_BACKFILL_LIMIT = 25       // process at most N books
 *
 * Safe to re-run: it only selects books missing `thumb` or `display`, and the
 * stored files are content-addressed, so nothing is duplicated or overwritten.
 * When it finishes it sets `window.GHAZAL_BACKFILL_RESULT` to a summary object.
 */
(async () => {
  const TOKEN_KEY = 'ghazal.adminToken';
  const THUMB = { side: 400, quality: 0.82 };
  const DISPLAY = { side: 1000, quality: 0.86 };
  const BATCH_SIZE = 20;
  const coverPathPattern = /^\/covers\/[a-f0-9]{64}\.[a-z]+$/;

  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    console.error('الغزال: سجّل الدخول إلى /admin.html أولًا ثم أعد تشغيل السكربت.');
    return;
  }
  const dryRun = Boolean(window.GHAZAL_BACKFILL_DRY_RUN);
  const limit = Number(window.GHAZAL_BACKFILL_LIMIT) || Infinity;

  const api = async (path, init = {}) => {
    const response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(init.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `request_failed_${response.status}`);
    return body;
  };

  const dataUrlBytes = value => {
    const comma = String(value || '').indexOf(',');
    return comma < 0 ? 0 : Math.floor((String(value).length - comma - 1) * 3 / 4);
  };

  const resize = async (blob, maxSide, quality) => {
    const image = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      // Already small enough: the caller reuses the original file instead.
      if (!(scale < 1) || !image.width || !image.height) return '';
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return '';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const type of ['image/webp', 'image/jpeg']) {
        const output = await new Promise(resolve => canvas.toBlob(resolve, type, quality));
        if (output?.size) return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(output); });
      }
      return '';
    } finally { if (typeof image.close === 'function') image.close(); }
  };

  console.log('الغزال: جارٍ قراءة الفهرس…');
  const { books } = await api('/api/admin/catalog');
  const missing = books.filter(book => coverPathPattern.test(String(book.image || '')) && (!book.thumb || !book.display));
  const remote = books.filter(book => /^https?:\/\//i.test(String(book.image || '')) && (!book.thumb || !book.display));
  const targets = missing.slice(0, limit);

  console.log(`الغزال: ${targets.length} كتابًا بحاجة إلى نسخ مصغّرة (من أصل ${books.length}).`);
  if (remote.length) console.warn(`الغزال: ${remote.length} غلافًا ما زال رابطًا خارجيًا — شغّل «cache-remote» أولًا.`);
  if (dryRun) {
    console.table(targets.slice(0, 50).map(book => ({ id: book.id, title: book.title, image: book.image })));
    return;
  }
  if (!targets.length) { window.GHAZAL_BACKFILL_RESULT = { total: 0, updated: 0, failed: 0, skipped: 0, beforeBytes: 0, afterBytes: 0 }; return; }

  let updated = 0; let failed = 0; let beforeBytes = 0; let afterBytes = 0;
  const pending = [];
  const flush = async () => {
    if (!pending.length) return;
    const result = await api('/api/admin/covers/backfill', { method: 'POST', body: JSON.stringify({ items: pending }) });
    updated += Number(result.updated || 0);
    pending.length = 0;
  };

  for (let index = 0; index < targets.length; index += 1) {
    const book = targets[index];
    const label = `[${index + 1}/${targets.length}]`;
    try {
      const response = await fetch(book.image);
      if (!response.ok) throw new Error(`cover_${response.status}`);
      const blob = await response.blob();
      const thumb = await resize(blob, THUMB.side, THUMB.quality);
      const display = await resize(blob, DISPLAY.side, DISPLAY.quality);
      const stored = await api('/api/admin/covers', {
        method: 'POST',
        // A cover that is already smaller than a target reuses the original
        // file, exactly like the importer does.
        body: JSON.stringify({ source: book.image, thumb: thumb || book.image, display: display || book.image })
      });
      if (!coverPathPattern.test(String(stored.thumb || '')) || !coverPathPattern.test(String(stored.display || ''))) throw new Error('store_failed');
      const addedBytes = (stored.thumb !== book.image ? dataUrlBytes(thumb) : 0) + (stored.display !== book.image ? dataUrlBytes(display) : 0);
      beforeBytes += blob.size;
      afterBytes += addedBytes;
      pending.push({ id: book.id, thumb: stored.thumb, display: stored.display });
      if (pending.length >= BATCH_SIZE) await flush();
      console.log(`${label} ✓ ${book.title} — ${Math.round(blob.size / 1024)}KB ← ${Math.round(addedBytes / 1024)}KB`);
    } catch (error) {
      failed += 1;
      console.warn(`${label} ✗ ${book.title} — ${error.message}`);
    }
  }
  try { await flush(); } catch (error) { console.error('الغزال: تعذّر حفظ الدفعة الأخيرة —', error.message); }

  const summary = { total: targets.length, updated, failed, skipped: targets.length - updated - failed, beforeBytes, afterBytes };
  window.GHAZAL_BACKFILL_RESULT = summary;
  console.log(`الغزال: انتهى — ${updated} محدَّث، ${failed} فشل. الحجم قبل: ${(beforeBytes / 1048576).toFixed(1)}MB، بعد: ${(afterBytes / 1048576).toFixed(1)}MB.`);
  return summary;
})();
