/* =====================================================================
   LAXTLINE — js/05-media-engine.js
   ---------------------------------------------------------------------
   SMART DYNAMIC MEDIA ENGINE

   Renders both galleries (#projectGalleryGrid = "gallery",
   #galleryGrid = "allprojects") from the owner's Drive-backed CDN.

     • Source of truth : a CDN folder per section (cross-device, permanent).
                         A small manifest.json in each folder stores the
                         ORDER + metadata (id, type, name, cat).
     • Fast paint      : localStorage mirror (laxtline_gallery /
                         laxtline_allprojects) paints instantly, then the
                         CDN listing reconciles it.
     • Type detection  : from MIME first, else file extension. Videos and
                         images NEVER cross-apply logic.
     • Ratio           : detected client-side from real media dimensions by
                         js/04-gallery-video.js (applyRatio) — no cropping.
     • Re-render       : window.reinitGallery() re-wires playback/lightbox.

   Public admin API (used by js/06-admin.js): window.LaxtMedia
     .get / .refresh / .add / .remove / .reorder / .setOrder / .count / .limit
   ===================================================================== */
(function () {
  'use strict';

  const CFG = window.LAXT_CDN;
  if (!CFG) { console.error('[Media] LAXT_CDN config missing — media engine disabled.'); return; }

  const MANIFEST_NAME = 'manifest.json';
  const SMALL_MAX     = 4 * 1024 * 1024;                 // <=4MB → simple upload
  const IMAGE_EXT     = ['jpg','jpeg','png','webp','gif','avif'];
  const VIDEO_EXT     = ['mp4','webm','mov','m4v','ogv'];
  const FOLDER_MIME   = 'application/vnd.google-apps.folder';

  const state = { gallery: [], allprojects: [] };

  // Admin session gate. Mutations (add/remove/reorder/setMeta) are only allowed
  // for a logged-in admin. This is a client-side gate — it stops trivial console
  // abuse of window.LaxtMedia by visitors. (The key itself is public by design;
  // real enforcement would require the CDN to verify a token server-side.)
  const ADMIN_SESSION_KEY = 'laxtline_admin_session';
  function requireAdmin() {
    if (localStorage.getItem(ADMIN_SESSION_KEY) !== '1') {
      throw new Error('Not authorized — admin login required.');
    }
  }

  // ── helpers ──────────────────────────────────────────────────────
  const stripExt  = n => (n || '').replace(/\.[^.]+$/, '');
  const escapeHtml = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function detectType(mime, name) {
    if (mime) {
      if (mime.indexOf('video/') === 0) return 'video';
      if (mime.indexOf('image/') === 0) return 'photo';
    }
    const ext = (name || '').split('.').pop().toLowerCase();
    if (VIDEO_EXT.indexOf(ext) !== -1) return 'video';
    if (IMAGE_EXT.indexOf(ext) !== -1) return 'photo';
    return 'photo';
  }
  const mediaUrl  = id => CFG.base + '/api/media/' + id;
  // Sized image URL for the grid (fast). Full-res is used by the fullscreen viewer.
  const imgUrl    = (id, w) => mediaUrl(id) + (w ? '?w=' + w : '');

  const cdnFetch = (path, opts) => {
    opts = opts || {};
    opts.headers = Object.assign({ 'x-api-key': CFG.key }, opts.headers || {});
    return fetch(CFG.base + path, opts);
  };

  // ── localStorage mirror (instant paint before the network responds) ──
  function loadCache(section) {
    try {
      const raw = localStorage.getItem(CFG.storeKeys[section]);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCache(section) {
    try { localStorage.setItem(CFG.storeKeys[section], JSON.stringify(state[section])); } catch (e) {}
  }

  // ── Manifest: ORDER + metadata, stored as a small JSON file inside the folder. ──
  // Return ALL manifest file ids in a folder (there can be stray duplicates if a
  // past write raced; we keep the newest and clean up the rest).
  async function listManifestIds(section) {
    const folder = CFG.folders[section];
    try {
      const r = await cdnFetch('/api/files?parent=' + folder);
      if (!r.ok) return [];
      const list = await r.json();
      return (list || [])
        .filter(f => f.name === MANIFEST_NAME)
        .sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || '')) // newest first
        .map(f => f.id);
    } catch (e) { return []; }
  }

  async function readManifest(section) {
    const ids = await listManifestIds(section);
    if (!ids.length) return null;
    try {
      // Newest manifest wins. Cache-bust so a just-written manifest isn't stale.
      const mr = await fetch(mediaUrl(ids[0]) + '?t=' + Date.now());
      if (!mr.ok) return null;
      const data = await mr.json();
      return Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
    } catch (e) { return null; }
  }

  // Per-section serialization: manifest writes are read-modify-write against a
  // single file, so concurrent writes (rapid reorders/deletes) would race and
  // spawn duplicate manifests. Chain them so each write is atomic.
  const _writeQueue = { gallery: Promise.resolve(), allprojects: Promise.resolve() };
  function writeManifest(section) {
    const run = _writeQueue[section].then(() => doWriteManifest(section), () => doWriteManifest(section));
    // Keep the chain alive even if this write rejects (caller still sees the rejection).
    _writeQueue[section] = run.catch(() => {});
    return run;
  }

  // Upload-then-delete: never leave the folder without a manifest. Snapshot the
  // existing ids FIRST, upload the new manifest, then delete the old ones only
  // after the new upload is confirmed.
  async function doWriteManifest(section) {
    const folder   = CFG.folders[section];
    const staleIds = await listManifestIds(section);
    const payload  = state[section].map(it => ({ id: it.id, type: it.type, name: it.name, cat: it.cat }));
    const blob     = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    const fd = new FormData();
    fd.append('file', blob, MANIFEST_NAME);
    fd.append('parent', folder);
    const r = await cdnFetch('/api/upload', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Manifest write failed (' + r.status + ')');
    const created = await r.json();

    // New manifest is live — now remove the old ones (best-effort).
    for (const id of staleIds) {
      if (id === created.id) continue;
      try { await cdnFetch('/api/files/' + id, { method: 'DELETE' }); } catch (e) {}
    }
    return created;
  }

  // ── Reconcile: list the real files in the folder, then order them by the
  //    manifest. Files present in the folder but missing from the manifest are
  //    appended (so nothing an admin uploaded ever disappears). ──
  async function fetchSection(section) {
    const folder = CFG.folders[section];
    let files = [];
    try {
      const r = await cdnFetch('/api/files?parent=' + folder);
      if (r.ok) files = await r.json();
    } catch (e) { return null; }

    const media = (files || [])
      .filter(f => f.mimeType !== FOLDER_MIME && f.name !== MANIFEST_NAME)
      .map(f => ({
        id:   f.id,
        type: detectType(f.mimeType, f.name),
        name: stripExt(f.name),
        cat:  '',
        mime: f.mimeType || ''
      }));

    const manifest = await readManifest(section);
    if (manifest && manifest.length) {
      const byId = {};
      media.forEach(m => { byId[m.id] = m; });
      const ordered = [];
      manifest.forEach(mItem => {
        const real = byId[mItem.id];
        if (real) {
          real.name = mItem.name || real.name;
          real.cat  = mItem.cat  || real.cat;
          if (mItem.type) real.type = mItem.type;
          ordered.push(real);
          delete byId[mItem.id];
        }
      });
      // Append any files not yet in the manifest (uploaded out-of-band).
      media.forEach(m => { if (byId[m.id]) ordered.push(m); });
      return ordered;
    }
    return media;
  }

  // ── Card markup — matches the structure js/04-gallery-video.js expects,
  //    so its playback / ratio / lightbox logic works unchanged. ──
  let _vidSeq = 0;
  const MUTE_SVGS =
    '<svg class="icon-muted" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="display:none"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white"/><line x1="15" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="15" y2="15"/></svg>' +
    '<svg class="icon-sound" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white"/><path d="M15.5 8.5 Q19 12 15.5 15.5" fill="none"/><path d="M18 6 Q23 12 18 18" fill="none"/></svg>';

  // MIME for a <source type>. Prefer the stored mime; else map the extension.
  // Wrong type hints make the browser refuse to decode (e.g. webm bytes as mp4).
  const VIDEO_MIME = { mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', m4v:'video/x-m4v', ogv:'video/ogg' };
  function videoMime(item) {
    if (item.mime && item.mime.indexOf('video/') === 0) return item.mime;
    const ext = (item.name || '').split('.').pop().toLowerCase();
    return VIDEO_MIME[ext] || 'video/mp4';
  }

  function buildCard(item) {
    const name = escapeHtml(item.name || '');
    const cat  = escapeHtml(item.cat  || '');
    const full = mediaUrl(item.id);            // full-res → fullscreen viewer

    const card = document.createElement('div');
    card.className = 'gal-item';
    card.dataset.type    = item.type;
    card.dataset.fsType  = item.type;
    card.dataset.fsSrc   = full;
    card.dataset.fsCat   = item.cat  || '';
    card.dataset.fsName  = item.name || '';
    card.dataset.mediaId = item.id;

    if (item.type === 'video') {
      const vid = 'dv' + (++_vidSeq);
      card.innerHTML =
        '<div class="gal-media-wrap">' +
          '<video class="gal-video" id="' + vid + '" loop playsinline preload="metadata" muted>' +
            '<source data-src="' + full + '" type="' + videoMime(item) + '">' +
          '</video>' +
          '<div class="gal-overlay"></div>' +
          '<div class="vid-thumb-overlay"><svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>' +
          '<div class="gal-play-btn"><svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>' +
          '<div class="gal-bottom"><div class="gal-info"><span class="gal-cat">' + cat + '</span><span class="gal-name">' + name + '</span></div>' +
            '<button class="gal-mute-btn" title="Mute/Unmute">' + MUTE_SVGS + '</button></div>' +
        '</div>';
    } else {
      card.innerHTML =
        '<div class="gal-media-wrap">' +
          '<img decoding="async" class="gal-photo" src="' + imgUrl(item.id, 1200) + '" alt="' + name + '" loading="lazy">' +
          '<div class="gal-overlay"></div>' +
          '<div class="gal-bottom"><div class="gal-info"><span class="gal-cat">' + cat + '</span><span class="gal-name">' + name + '</span></div></div>' +
        '</div>';
    }
    return card;
  }

  const gridEl  = section => document.getElementById(section === 'gallery' ? 'projectGalleryGrid' : 'galleryGrid');
  const emptyEl = section => document.getElementById(section === 'gallery' ? 'galleryEmpty' : 'allprojectsEmpty');

  function render(section) {
    const grid = gridEl(section);
    if (!grid) return;
    const items = state[section];
    // Detach old cards' videos from the IntersectionObservers before clearing,
    // else the singleton observers keep references to detached nodes → memory leak
    // that grows with every re-render (reorder fires one per click).
    if (window.unwireGallery) window.unwireGallery(grid);
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(it => frag.appendChild(buildCard(it)));
    grid.appendChild(frag);

    const empty = emptyEl(section);
    if (empty) empty.hidden = items.length > 0;

    // Re-wire playback / ratio / lightbox on the freshly injected cards.
    if (window.reinitGallery) window.reinitGallery();
    // Notify the admin panel so it can refresh its list + counts.
    document.dispatchEvent(new CustomEvent('laxt:media-rendered', { detail: { section: section, count: items.length } }));
  }

  // ── Refresh a section from the CDN and re-render. Returns the item list. ──
  async function refresh(section) {
    const items = await fetchSection(section);
    if (items) {
      state[section] = items;
      saveCache(section);
      render(section);
    }
    return state[section];
  }

  // ══════════════════════════════════════════════════════════════
  //  ADMIN API  (window.LaxtMedia) — used by js/06-admin.js
  //  Read methods (get/count/limit/refresh) are open. Mutating methods
  //  (add/remove/reorder/setMeta) call requireAdmin() first, so a
  //  logged-out visitor cannot drive them from the console.
  // ══════════════════════════════════════════════════════════════
  const LaxtMedia = {
    get:   section => state[section].slice(),
    count: section => state[section].length,
    limit: section => CFG.limits[section],
    refresh: refresh,

    // Upload a File → CDN, append to section, persist manifest, re-render.
    // onProgress(0..1) is optional. Uses direct resumable upload for big files.
    async add(section, file, onProgress) {
      requireAdmin();
      if (state[section].length >= CFG.limits[section]) {
        throw new Error('Limit reached (' + CFG.limits[section] + ')');
      }
      const type = detectType(file.type, file.name);
      if (type !== 'video' && type !== 'photo') throw new Error('Unsupported file type');

      const uploaded = file.size > SMALL_MAX
        ? await uploadLarge(section, file, onProgress)
        : await uploadSmall(section, file, onProgress);

      state[section].push({
        id:   uploaded.id,
        type: detectType(uploaded.mimeType || file.type, uploaded.name || file.name),
        name: stripExt(uploaded.name || file.name),
        cat:  '',
        mime: uploaded.mimeType || file.type || ''
      });
      saveCache(section);
      render(section);
      // Persist order after render (the file is already uploaded; a failed
      // manifest write only loses ordering, which the next refresh re-appends).
      await writeManifest(section).catch(e => console.warn('[Media] manifest write failed:', e));
      return state[section][state[section].length - 1];
    },

    // Delete by CDN id → remove from folder + manifest, re-render.
    async remove(section, id) {
      requireAdmin();
      const r = await cdnFetch('/api/files/' + id, { method: 'DELETE' });
      // Check the response: a swallowed failure drops the item from state while
      // it still exists on the CDN, so it reappears on the next refresh().
      if (!r.ok) throw new Error('Delete failed (' + r.status + ')');
      state[section] = state[section].filter(it => it.id !== id);
      saveCache(section);
      await writeManifest(section);
      render(section);
    },

    // Move an item within the section (reorder), persist new order.
    // Persist BEFORE re-render so a failed write can revert to the CDN truth.
    async reorder(section, fromIdx, toIdx) {
      requireAdmin();
      const arr = state[section];
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      saveCache(section);
      render(section);
      try {
        await writeManifest(section);
      } catch (e) {
        // Order didn't persist — pull the real order back so UI matches the CDN.
        await refresh(section);
        throw e;
      }
    },

    // Update editable metadata (name / cat) for one item.
    async setMeta(section, id, patch) {
      requireAdmin();
      const it = state[section].find(x => x.id === id);
      if (!it) return;
      if (patch.name != null) it.name = patch.name;
      if (patch.cat  != null) it.cat  = patch.cat;
      saveCache(section);
      render(section);
      try { await writeManifest(section); }
      catch (e) { await refresh(section); throw e; }
    }
  };

  // ── Small upload (<=4MB): multipart through the CDN /api/upload. ──
  async function uploadSmall(section, file, onProgress) {
    if (onProgress) onProgress(0.1);
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('parent', CFG.folders[section]);
    const r = await cdnFetch('/api/upload', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Upload failed (' + r.status + ')');
    if (onProgress) onProgress(1);
    return r.json();
  }

  // ── Large upload (>4MB, videos): 2-step resumable session, PUT direct to
  //    Google from the browser with real progress via XHR. ──
  async function uploadLarge(section, file, onProgress) {
    const sr = await cdnFetch('/api/upload/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mimeType: file.type || 'application/octet-stream', parent: CFG.folders[section] })
    });
    if (!sr.ok) throw new Error('Session failed (' + sr.status + ')');
    const { uploadUrl } = await sr.json();
    if (!uploadUrl) throw new Error('No upload URL returned');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ id: data.id, name: data.name || file.name, mimeType: data.mimeType || file.type });
          } catch (e) { reject(new Error('Bad session response')); }
        } else { reject(new Error('Direct upload failed (' + xhr.status + ')')); }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  window.LaxtMedia = LaxtMedia;

  // ── INIT: paint from cache instantly, then reconcile from the CDN. ──
  function init() {
    ['gallery', 'allprojects'].forEach(section => {
      const cached = loadCache(section);
      if (cached.length) { state[section] = cached; render(section); }
      else { const e = emptyEl(section); if (e) e.hidden = false; }
      refresh(section);   // network reconcile (fire and forget)
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
