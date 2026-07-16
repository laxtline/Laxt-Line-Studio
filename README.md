# LAXTLINE — Portfolio Website

A cinematic, single‑page portfolio for **LAXTLINE** — a visual storyteller & video editor based in
Bhubaneswar, Odisha, India. The site showcases video edits, VFX, color grading, gaming montages,
photo edits and design work through an interactive, animation‑rich gallery experience.

> Built with plain **HTML + CSS + JavaScript** (no frameworks, no build step). Originally written as
> one large file, it has been refactored into a clean, professional structure (separate HTML, CSS and
> JS) **without changing how the website looks or behaves**.

---

## 📑 Table of Contents

1. [Features](#-features)
2. [Folder Structure](#-folder-structure)
3. [File Reference](#-file-reference)
4. [How to Run](#-how-to-run)
5. [Deployment & Going Live](#-deployment--going-live)
6. [SEO & Meta Files](#-seo--meta-files)
7. [Tech Stack](#-tech-stack)
8. [Performance Notes](#-performance-notes)
9. [Editing Guide](#-editing-guide)
10. [Branding Note](#-branding-note)
11. [Contact](#-contact)

---

## ✨ Features

- **Hero section** with an animated particle/grid canvas background and a large brand watermark.
- **Custom cursor** with a smooth trailing follower (auto‑disabled on touch devices).
- **Marquee ribbons** of skills scrolling in both directions.
- **Work / Project Gallery** — masonry layout with hover‑to‑play videos and sound.
- **"All Projects" section** — the complete catalogue of video & photo work.
- **Fullscreen viewer (lightbox)** — play/pause, seek bar, volume, prev/next, keyboard shortcuts.
- **About, Services, Software & Tools, Contact, Socials** sections.
- **Section‑entrance animations** — content (headings, text, images, logo, details, buttons) slides/
  fades in each time a section scrolls into view and settles after ~2–3 seconds; it **replays** every
  time you scroll back. Applied to Hero, About, Services, Software, Contact and Socials — the Project
  Gallery and All Projects sections are intentionally left untouched. Self‑contained in `index.html`,
  GPU‑only, and respects `prefers‑reduced‑motion`.
- **Smart, memory‑safe lazy loading** — videos load only when near the viewport and are released
  from memory once far off‑screen, so the page stays smooth even with 65+ videos.
- **SEO‑ready** — meta description, Open Graph & Twitter cards, sitemap, robots.txt and a PWA manifest.
- Fully **responsive** and performance‑optimised (GPU‑friendly animations, throttled scroll,
  paused off‑screen work).

---

## 📁 Folder Structure

```
edit/
├── index.html                  ← Main entry point (open / host this)
├── README.md                   ← This file
│
├── robots.txt                  ← Search‑engine crawl rules
├── sitemap.xml                 ← List of URLs for search engines
├── site.webmanifest            ← PWA / "Add to Home Screen" metadata
│
├── css/
│   ├── main.css                ← Global styles (nav, hero, sections, responsive)
│   └── gallery.css             ← Gallery grid + fullscreen viewer styles
│
├── js/
│   ├── 01-cursor-init.js       ← Creates the custom cursor (desktop only)
│   ├── 02-interactions.js      ← Hero canvas, cursor, scroll‑reveal, nav, menu
│   ├── 03-gallery-config.js    ← Gallery status/config marker
│   └── 04-gallery-video.js     ← Video engine, lazy‑load + memory release, viewer
│
├── All Projects/               ← All gallery media (videos .mp4 + images .jpg)
├── Logo  & Background/          ← Logo & background image assets
│
├── All Projects.txt            ← Author's source notes / file list
├── Logo  & Background.txt        ← Author's source notes
├── Project Gallery.txt          ← Author's source notes
│
└── SURYA_FX.com.html           ← Original single‑file version (backup; filename unchanged)
```

> **Load order matters:** CSS is linked in `<head>` as `main.css` then `gallery.css`; the four JS
> files load in their original positions/order. This is intentional and keeps behaviour identical to
> the original single file. Every `.html`, `.css` and `.js` file starts with a header comment block,
> and the code is commented throughout to explain *what each part does and why*.

---

## 🗂 File Reference

| File | What it does |
|------|--------------|
| `index.html` | The whole page markup: head/SEO meta, all sections, gallery cards, fullscreen‑viewer container. Also holds two small inline `<style>`/`<script>` blocks (`fxe-section-anim`) that power the per‑section content entrance animations. |
| `css/main.css` | Brand variables (`:root`), nav, hero, marquee, work, about, services, software, contact, socials, footer + responsive breakpoints. |
| `css/gallery.css` | Masonry gallery cards, hover overlays, play/mute buttons and all `.fsv-*` fullscreen‑viewer styles. |
| `js/01-cursor-init.js` | Inserts the cursor dot + ring (skipped on touch devices). Runs first so later code can find them. |
| `js/02-interactions.js` | Hero canvas animation, custom‑cursor motion, scroll‑reveal observer, nav scroll state, hamburger menu. |
| `js/03-gallery-config.js` | Small marker that logs the gallery is ready (items are hardcoded in HTML). |
| `js/04-gallery-video.js` | The big one: hover/touch playback, autoplay‑unmute, **lazy‑load + memory release**, aspect‑ratio sizing, fullscreen viewer, missing‑file fallback. |
| `robots.txt` | Allows crawlers and points them to the sitemap. |
| `sitemap.xml` | Lists the homepage + main section anchors for search engines. |
| `site.webmanifest` | App name, colors and icon for installable‑PWA / mobile home‑screen. |
| `SURYA_FX.com.html` | Legacy all‑in‑one copy, kept as a working backup. |

---

## 🚀 How to Run

**Option 1 — Open directly:** double‑click `index.html`. Everything is static, so no build step is needed.

**Option 2 — Local server (recommended; some browsers limit video autoplay on `file://`):**

```bash
# From inside the "edit" folder:
python -m http.server 8000      # Python 3
# or
npx serve .                     # Node.js
```

Then open <http://localhost:8000>.

---

## 🌐 Deployment & Going Live

You can host these files on any static host — **GitHub Pages, Netlify, Vercel, Cloudflare Pages**, or
normal web hosting. Just upload the whole `edit/` folder contents (keep the folder layout intact).

> **⚠️ One thing to update before/after going live:** the SEO files use a placeholder domain
> `https://www.laxtline.com`. Replace it with your real domain in **three places**:
> 1. `robots.txt` → the `Sitemap:` line
> 2. `sitemap.xml` → every `<loc>` URL
> 3. `index.html` → the `canonical`, `og:url`, `og:image` and `twitter:image` tags
>
> If you don't have a custom domain yet, just use whatever URL the host gives you (e.g.
> `https://username.github.io/`).

---

## 🔎 SEO & Meta Files

These make the site look professional in Google results and in link previews (WhatsApp, Instagram
bio link, LinkedIn, X):

- **`<head>` meta** — `description`, `keywords`, `author`, `robots`, plus **Open Graph** and
  **Twitter Card** tags so a shared link shows a title, description and image preview.
- **`robots.txt`** — tells crawlers they may index everything and where the sitemap is.
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
  `requestAnimationFrame` and the HTML5 `<video>` API.
- **Google Fonts** — Bebas Neue, DM Sans, Space Mono.

---

## ⚡ Performance Notes

The gallery stays smooth even with a large number of videos:

- **Lazy loading** — a video's source is fetched only when it comes within ~300px of the viewport.
- **Memory release** — when a video scrolls more than ~1400px away, its decoded buffer is released
  and automatically reloaded if you scroll back. This prevents the browser from running out of
  memory (which previously caused slowdowns / freezing near the bottom of the page).
- **Off‑screen work is paused** — the hero canvas and CSS animations stop when not visible and when
  the browser tab is hidden.

---

## 🛠 Editing Guide

- **Change styling:** edit `css/main.css` (general look) or `css/gallery.css` (gallery & viewer).
  Brand colors live in `:root` at the top of `main.css` — change them once, they update everywhere.
- **Change behaviour:** edit the relevant file in `js/` (each has a header explaining its job).
- **Add / remove gallery items:** copy one `class="gal-item"` block in `index.html`, change the
  `data-fs-src`, `data-fs-type`, `data-fs-cat`, `data-fs-name` attributes and the media file name,
  then drop the file into the `All Projects/` folder. (A full comment above the first card in
  `index.html` explains the pattern.)
- **Media paths** use the existing folder names (`All Projects/…`, `Logo  & Background/…`). If you
  rename a folder, update every reference in `index.html` accordingly.

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

© 2025 LAXTLINE Studio. All Rights Reserved.
