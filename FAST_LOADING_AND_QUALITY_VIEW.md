# LAXTLINE — Fast Media Loading & Quality View

How the **Project Gallery** and **All Projects (all-work)** sections load dozens of
MP4s smoothly without lag, while still showing full-quality video when a card is
opened fullscreen. Applies to `index.html` (external `js/04-gallery-video.js`) and the
self-contained `laxtline.studio.html` (same logic inlined).

All animations (hero glows, marquee, cursor, hover reveals) are **kept** — none of the
performance work removes motion; it only pauses off-screen animations to save GPU.

---

## 1. The core idea

A video card goes through **five states**, and at every moment each card holds the
*least* data it can while still looking finished:

```
  poster only  →  metadata  →  warmed (buffering)  →  playing  →  released
  (JPEG ~30KB)    (dims +        (preload=auto,        (hover/    (buffer freed
                   1st frame)     start of file)        tap)       when far away)
```

Nothing downloads video bytes until a card is near the viewport, and any card that
scrolls far away is **released** to free memory. This is what stops the page from
lagging or freezing after scrolling past many clips.

---

## 2. Two-quality strategy (fast load vs. quality view)

This is the key to "fast loading **and** quality view." Every project exists as **two
Cloudinary URLs**:

| Where | Attribute | Cloudinary transform | Purpose |
|-------|-----------|----------------------|---------|
| Card in the grid | `<source data-src=...>` | `q_auto:low,w_640,c_limit,br_800k` | Small, fast-streaming preview |
| Fullscreen viewer | `data-fs-src=...` | `q_auto` (full res) | Full-quality playback on demand |
| Instant thumbnail | `video.poster` (generated) | `so_0,w_640,c_limit,f_auto,q_auto` (`.jpg`) | ~20–40 KB first-frame image, **zero** video bytes |

> **Why the `br_800k` bitrate cap (measured, not guessed):** `q_auto:low` alone left
> previews at **~1.78 MB** because these are high-motion edits whose bitrate spikes. `f_auto`
> gave **zero** benefit (Cloudinary returns the same H.264). An explicit total-bitrate cap
> `br_800k` at `w_640` drops each preview to **~0.9 MB (−49%)** while keeping the audio track
> — roughly halving load time and first-play latency across both the Project Gallery and All
> Projects grids. Full detail is untouched: the fullscreen viewer still streams `q_auto`
> (~5 MB). Measured with `curl` against the live Cloudinary account, July 2026.

- **Grid cards** stream a **720px, low-bitrate** version — enough to look great inline,
  cheap enough to play instantly on hover.
- **Fullscreen viewer** swaps in the **full-quality** `data-fs-src`, so when the user
  actually wants to inspect a piece, they get the real thing.
- **Posters** are generated on the fly from each video's *own* URL (`so_0` = frame at
  0s, rendered as `.jpg`), so cards look finished the instant the section appears —
  before a single byte of MP4 is fetched.

> **Important:** the poster URL derives the Cloudinary **cloud name from the video's own
> `source` URL** — it is never hardcoded. A hardcoded cloud name that doesn't match the
> media account makes every poster 404, leaving cards blank until the video loads (this
> was the "slow media loading / lag" bug that was fixed). See `applyCloudinaryPoster()`
> and `applyAllWorkPostersEarly()`.

---

## 3. The loading pipeline (functions in `04-gallery-video.js`)

### Posters first (no video bytes)
- `applyCloudinaryPoster(video)` — builds the capped `.jpg` poster from the source URL.
- `applyAllWorkPostersDeferred()` — pre-applies posters to the **52 all-work cards** so
  the dense grid never shows blank grey boxes. **Crucially, this is deferred and
  batched:** it waits for `requestIdleCallback` *after* the `load` event, then applies
  posters `6` at a time with a `250ms` gap. Setting `.poster` starts an immediate JPEG
  download, so applying all 52 at once on DOM-ready fires 52 simultaneous requests that
  fight the hero paint and the visible gallery's posters — that network storm was felt
  as **lag the moment the site opened**. Deferring it keeps entry smooth while
  thumbnails still fill in before the user scrolls down. (The lazy-load observer stays
  the primary path; the `if (v.poster) return` guard keeps this idempotent.)

### Lazy load + memory release — `setupLazyLoad(selector)`
Wires **four** IntersectionObservers per video:

1. **`loadObs` / `loadObsDense`** — attaches the `data-src` → `src` and calls `load()`
   with `preload="metadata"` (downloads dimensions + first frame only).
   - Normal gallery (~15 videos): `rootMargin: 300px` — load a little ahead.
   - Dense all-work grid (52 videos): `rootMargin: 200px` — load closer to the viewport
     so scrolling in doesn't trigger a mass network spike.
2. **`warmObs`** (30% visible) — upgrades `preload` to `auto` (`warmVid`) so the start of
   the file buffers ahead of time. **This removes the sound delay / stutter on first
   play.** Concurrent warms are capped at `MAX_WARM` (6) across **both** sections; the
   oldest warmed video is `coolVid()`-ed back to `metadata` to keep bandwidth bounded.
   > **Why the cap must cover both grids:** the cap originally applied *only* to the
   > dense all-work grid. The smaller Project Gallery therefore had **no cap**, so every
   > visible card started a full-buffer download at once when the section scrolled in — a
   > bandwidth storm that made the gallery stall (media not loading), fail to start audio
   > on the hovered clip (no sound), and lag, even though All Projects stayed smooth.
   > Capping both sections is what fixed the "gallery-only" problem.
3. **`keepObs`** (`rootMargin: 1400px`) — when a card is *far* off-screen, `unloadVid()`
   detaches its `src` and calls `load()`, **freeing the decoded video buffer**. Layout
   doesn't shift because the wrapper keeps its `padding-bottom` aspect ratio.

### Aspect-ratio handling — `applyRatio()` / `detectVideoRatio()`
Reads real `videoWidth/videoHeight` from metadata and sets `padding-bottom` on the
wrapper, so the masonry grid never jumps as videos load.

---

## 4. Playback & sound (unchanged behaviour, summarised)

- **Desktop:** hover a card → plays **with sound**; leave → pause + reset.
- **Mobile:** IntersectionObserver autoplays **muted** when ≥50% visible (Reels style);
  first tap unlocks sound site-wide; the "sound keeper" re-asserts unmute from live
  touch/scroll gestures (works around iOS's gesture rule).
- **Fullscreen viewer (`fsvOpen`)** loads the full-quality `data-fs-src` with seek bar,
  volume, prev/next, and keyboard shortcuts.

---

## 5. Animations are preserved (only paused off-screen)

Performance work never deletes motion. It only pauses work the user can't see:

- Hero glows + background text → `animationPlayState = 'paused'` when the hero scrolls
  off-screen (`heroObs`), resumed when back in view.
- Marquee rows → paused off-screen (`mObs`).
- `visibilitychange` → when the browser tab is hidden, CSS animations pause and any
  playing video pauses; everything resumes on return.

---

## 6. If you add or move media

1. Add **both** URLs: card `<source data-src>` at `q_auto:low,w_720,c_limit`, and the
   card's `data-fs-src` at `q_auto` (full quality).
2. Do **not** hardcode a cloud name for posters — the code reads it from the source URL.
3. For all-work cards, set `data-all-work="1"` so they use the dense-grid observers and
   the warm-limit.
4. Nothing else to build — the gallery is hardcoded HTML; there is no build step.

---

*Last updated: 2026-07-09*
