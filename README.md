# LAXTLINE — Portfolio Website

A cinematic, single‑page portfolio for **LAXTLINE** — a visual storyteller & video editor based in
Bhubaneswar, Odisha, India. The site showcases video edits, VFX, color grading, gaming montages,
photo edits and design work through an interactive, animation‑rich gallery experience.

> Built with plain **HTML + CSS + JavaScript** (no frameworks, no build step). All portfolio media
> is served from the owner's own **Drive‑backed media CDN** and managed through a **hidden admin
> panel** — updating the portfolio needs zero code changes.

**Live:**

- 🌐 Vercel (primary): <https://laxt-line-studio.vercel.app>
- 🌐 GitHub Pages: <https://laxtline.github.io/laxt-line-studio/>

---

## 📑 Table of Contents

1. [Features](#-features)
2. [Dynamic Media System](#-dynamic-media-system)
3. [Admin Panel](#-admin-panel)
4. [Folder Structure](#-folder-structure)
5. [File Reference](#-file-reference)
6. [How to Run](#-how-to-run)
7. [Deployment & Going Live](#-deployment--going-live)
8. [SEO & Meta Files](#-seo--meta-files)
9. [Tech Stack](#-tech-stack)
10. [Performance Notes](#-performance-notes)
11. [Editing Guide](#-editing-guide)
12. [Branding Note](#-branding-note)
13. [Contact](#-contact)

---

## ✨ Features

- **Hero section** with an animated particle/grid canvas background and a large brand watermark.
- **Custom cursor** with a smooth trailing follower (auto‑disabled on touch devices).
- **Marquee ribbons** of skills scrolling in both directions.
- **Work / Project Gallery** — dynamic masonry layout (up to 15 items) with hover‑to‑play videos
  and sound.
- **"All Projects" section** — the complete catalogue (up to 100 items), fully CDN‑driven.
- **Hidden admin panel** — login from the site itself, then upload / delete / reorder media; the
  site updates instantly on every device. See [Admin Panel](#-admin-panel).
- **Fullscreen viewer (lightbox)** — play/pause, seek bar, volume, prev/next, keyboard shortcuts.
- **About, Services, Software & Tools, Contact, Socials** sections.
- **Section‑entrance animations** — content slides/fades in each time a section scrolls into view;
  replays on every scroll‑back. GPU‑only and respects `prefers‑reduced‑motion`.
- **Smart, memory‑safe lazy loading** — videos load only when near the viewport and are released
  from memory once far off‑screen, so the page stays smooth at any media count.
- **SEO‑ready** — meta description, Open Graph & Twitter cards, sitemap and a PWA manifest.
- Fully **responsive** and performance‑optimised (GPU‑friendly animations, throttled scroll,
  paused off‑screen work, keyboard `:focus-visible` support).

---

## 🎞 Dynamic Media System

There are **no hardcoded media files** in the HTML. Both gallery sections render at runtime from
the owner's media CDN (`drive-media-cdn.vercel.app`, backed by Google Drive):

| Section | CDN folder | Max items | localStorage cache key |
| --- | --- | --- | --- |
| Project Gallery (`#projectGalleryGrid`) | `laxtline_gallery` | 15 | `laxtline_gallery` |
| All Projects (`#galleryGrid`) | `laxtline_allprojects` | 100 | `laxtline_allprojects` |

How it works (`js/05-media-engine.js`):

- Each CDN folder holds the media files plus a small `manifest.json` storing **order + metadata**.
  Manifest writes are serialized (upload‑new‑then‑delete‑old) so rapid edits can't corrupt order.
- **Type detection** from MIME first, then file extension — `.mp4` → video logic, `.jpg/.png/.webp`
  → image logic. Never cross‑applied.
- **Native aspect ratio** is detected from the real media dimensions — a 9:16 reel renders 9:16, a
  16:9 video renders 16:9. No cropping, no stretching, no fixed slots.
- **Instant paint** — the last known state is cached in `localStorage` and painted immediately,
  then reconciled against the CDN listing in the background.
- Grid is fully fluid: the section ends exactly at the last item, whether there is 1 or 100.

---

## 🔐 Admin Panel

- A small, low‑key **gear icon fixed at the top‑right** of the page opens the login modal.
- After login, the **Media Manager** panel slides in with two independent zones (Project Gallery
  and All Projects), each showing a live count (e.g. `9 / 15`).
- Per item: **upload** (file picker or drag‑and‑drop), **delete**, **reorder** (drag rows or use
  ▲/▼ buttons). Accepted formats: JPG, JPEG, PNG, WEBP, MP4.
- Large videos (>4 MB, up to 4K) upload via a **resumable direct‑to‑Drive session** with a real
  progress bar — the UI never freezes.
- The panel's DOM is **built only after a successful login** — logged‑out visitors have nothing to
  inspect. The session persists in `localStorage` across refreshes; mutation APIs are gated behind
  the same session check.

---

## 📁 Folder Structure

```
laxt-line-studio/
├── index.html                  ← Main entry point (open / host this)
├── README.md                   ← This file
│
├── sitemap.xml                 ← List of URLs for search engines
├── site.webmanifest            ← PWA / "Add to Home Screen" metadata
│
├── assets/                     ← Static page images (hero, about, section backgrounds)
│
├── css/
│   ├── main.css                ← Global styles (nav, hero, sections, responsive)
│   ├── gallery.css             ← Gallery grid + fullscreen viewer styles
│   └── admin.css               ← Admin trigger, login modal & upload panel styles
│
├── js/
│   ├── 01-cursor-init.js       ← Creates the custom cursor (desktop only)
│   ├── 02-interactions.js      ← Hero canvas, cursor, scroll‑reveal, nav, menu
│   ├── 03-gallery-config.js    ← Status marker (gallery is dynamic now)
│   ├── 04-gallery-video.js     ← Video engine, lazy‑load + memory release, viewer
│   ├── 05-media-engine.js      ← Dynamic media renderer + CDN API (LaxtMedia)
│   └── 06-admin.js             ← Hidden admin login + upload panel
│
├── Logo  & Background/         ← Logo & background image assets
└── Docs/                       ← Author's notes & documentation (not part of the site)
```

> **Load order matters:** CSS loads as `main.css` → `gallery.css` → `admin.css`; JS loads
> `01 → 06` in order at their original positions. Every `.html`, `.css` and `.js` file starts with
> a header comment block explaining *what it does and why*.

---

## 🗂 File Reference

| File | What it does |
|------|--------------|
| `index.html` | Page markup: head/SEO meta, the `window.LAXT_CDN` config (CDN base URL, folder IDs, limits), all sections, empty gallery grids (filled by JS) and the entrance‑animation blocks. |
| `css/main.css` | Brand variables (`:root`), nav, hero, marquee, sections, footer, `:focus-visible`, responsive breakpoints. |
| `css/gallery.css` | Masonry gallery cards, hover overlays, play/mute buttons and all `.fsv-*` fullscreen‑viewer styles. |
| `css/admin.css` | Admin gear icon, login modal, Media Manager panel, progress bars, toasts. |
| `js/01-cursor-init.js` | Inserts the cursor dot + ring (skipped on touch devices). |
| `js/02-interactions.js` | Hero canvas animation, custom‑cursor motion, scroll‑reveal observer, nav scroll state, hamburger menu. |
| `js/03-gallery-config.js` | Small status marker (media is rendered dynamically). |
| `js/04-gallery-video.js` | Playback engine: hover/touch play, autoplay‑unmute, **lazy‑load + memory release**, ratio sizing, fullscreen viewer, `reinitGallery()`/`unwireGallery()` hooks for re-renders. |
| `js/05-media-engine.js` | Fetches CDN folders + manifest, builds gallery cards, exposes `window.LaxtMedia` (get / add / remove / reorder — mutations admin‑gated), handles small & resumable uploads. |
| `js/06-admin.js` | Gear trigger, login modal, Media Manager panel (upload zones, counts, delete, drag reorder). |
| `sitemap.xml` | Lists the homepage + main section anchors for search engines. |
| `site.webmanifest` | App name, colors and icon for installable‑PWA / mobile home‑screen. |

---

## 🚀 How to Run

**Option 1 — Open directly:** double‑click `index.html`. Everything is static, so no build step is
needed (media loads from the CDN, so you need internet).

**Option 2 — Local server (recommended; some browsers limit video autoplay on `file://`):**

```bash
python -m http.server 8000      # Python 3
# or
npx serve .                     # Node.js
```

Then open <http://localhost:8000>.

---

## 🌐 Deployment & Going Live

The site is deployed on **two hosts** from the same GitHub repo
([`laxtline/laxt-line-studio`](https://github.com/laxtline/laxt-line-studio)):

- **Vercel** (primary / canonical): <https://laxt-line-studio.vercel.app> — auto‑deploys on every
  push to `main`.
- **GitHub Pages**: <https://laxtline.github.io/laxt-line-studio/> — served from the `main` branch.

To publish changes: commit and `git push origin main` — both hosts update automatically.

> **⚠️ If you move to a custom domain later**, replace `https://laxt-line-studio.vercel.app` in:
>
> 1. `sitemap.xml` → every `<loc>` URL
> 2. `index.html` → the `canonical`, `og:url`, `og:image` and `twitter:image` tags

---

## 🔎 SEO & Meta Files

These make the site look professional in Google results and in link previews (WhatsApp, Instagram
bio link, LinkedIn, X):

- **`<head>` meta** — `description`, `keywords`, `author`, `robots`, plus **Open Graph** and
  **Twitter Card** tags so a shared link shows a title, description and image preview.
- **`sitemap.xml`** — a map of the site's URLs to help search engines crawl it.
- **`site.webmanifest`** — lets the site be "Added to Home Screen" like an app, with the brand name,
  theme color and icon.

> **Icon tip:** the manifest/favicon currently point to `Logo  & Background/logo.jpeg`. For the
> sharpest result, export square PNG icons (e.g. `icon-192.png` and `icon-512.png`) and update the
> `icons` array in `site.webmanifest` and the `<link rel="icon">` tags in `index.html`.

---

## 🧱 Tech Stack

- **HTML5** — semantic, single‑page structure.
- **CSS3** — custom properties, grid & flexbox, multi‑column masonry, keyframe animations,
  backdrop filters, `content-visibility` and containment for performance.
- **Vanilla JavaScript** — no frameworks, no dependencies. Uses `IntersectionObserver`,
  `requestAnimationFrame`, `fetch`/`XMLHttpRequest` and the HTML5 `<video>` API.
- **Media backend** — the owner's own Drive‑backed CDN (`drive-media-cdn.vercel.app`) for permanent
  media URLs, image resizing (`?w=`) and resumable video uploads.
- **Google Fonts** — Bebas Neue, DM Sans, Space Mono.

---

## ⚡ Performance Notes

The gallery stays smooth even with a large number of videos:

- **Lazy loading** — a video's source is fetched only when it comes within ~300px of the viewport.
- **Memory release** — when a video scrolls more than ~1400px away, its decoded buffer is released
  and automatically reloaded if you scroll back. Re-renders detach old nodes from the observers so
  memory never grows across admin edits.
- **Sized images** — grid images request a resized version from the CDN (`?w=1200`); the fullscreen
  viewer loads the original.
- **Instant paint** — the media list paints from `localStorage` cache before the network responds.
- **Off‑screen work is paused** — the hero canvas and CSS animations stop when not visible and when
  the browser tab is hidden.
- `index.html` is ~49 KB — page images live in `assets/` as cacheable files.

---

## 🛠 Editing Guide

- **Update portfolio media:** don't touch the code — click the gear icon (top‑right), log in, and
  use the Media Manager to upload / delete / reorder. Changes go live instantly on all devices.
- **Change styling:** edit `css/main.css` (general look) or `css/gallery.css` (gallery & viewer) or
  `css/admin.css` (admin panel). Brand colors live in `:root` at the top of `main.css`.
- **Change behaviour:** edit the relevant file in `js/` (each has a header explaining its job).
- **Change CDN folders / limits:** edit the `window.LAXT_CDN` config block in `index.html`'s head.

---

## 🏷 Branding Note

The visible brand name is **LAXTLINE** (shown in the nav, hero watermark, footer and titles, with the
"LINE" half accented in brand red). The following are **real account links / contact details** and are
intentionally left unchanged so they keep working — update them only with your own new handles:

- Social usernames in the Socials section (Instagram, LinkedIn, GitHub, YouTube, Snapchat, etc.)
- The Google Drive link
- Email & phone in the Contact section

---

## 📬 Contact

- **Email:** suryakant321pradhan@gmail.com
- **Phone:** +91 78480 03467
- **Location:** Bhubaneswar, Odisha, India

---

© 2025–2026 LAXTLINE Studio. All Rights Reserved.
