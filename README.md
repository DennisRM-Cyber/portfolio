# Rubui Mwangi — Portfolio

> Personal portfolio website built from scratch using HTML, CSS, and JavaScript.
> Electrical & Electronics Engineer · JKUAT Graduate · Nairobi, Kenya.

**Live site:** [dennisrm-cyber.github.io/portfolio](https://dennisrm-cyber.github.io/portfolio)
**Status:** 🟢 Phase 2 complete — all pages live

---

## Quick start (local development)

```bash
# 1. Clone the repo
git clone https://github.com/DennisRM-Cyber/portfolio.git
cd portfolio

# 2. Open in VS Code
code .

# 3. Start Live Server
#    Install the "Live Server" extension if you haven't already,
#    then click "Go Live" in the bottom-right status bar.
#    The site always opens at index.html — see .vscode/settings.json
```

---

## Project structure

```
portfolio/
├── index.html            ← Homepage (entry point)
├── about.html            ← Bio, experience, education
├── projects.html         ← Project cards with file downloads
├── skills.html           ← Skill bars, certs, tools
├── articles.html         ← Articles and build log
├── media.html            ← Photography, design, video, social
├── contact.html          ← Contact form and socials
│
├── css/
│   └── style.css         ← Shared stylesheet (all pages)
│
├── js/
│   ├── main.js           ← Shared scripts (nav, scroll, animations)
│   └── editor.js         ← Owner-only editing system
│
├── assets/
│   ├── images/           ← Profile photo, card thumbnails
│   ├── docs/             ← CVs, PDFs, AutoCAD exports (committed once)
│   └── videos/           ← Short local clips only; embed YouTube for anything longer
│
├── 404.html              ← Redirects stale URLs back to homepage
├── .vscode/
│   └── settings.json     ← Locks Live Server to always open index.html
└── README.md             ← This file
```

---

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | ✅ Complete |
| About | `about.html` | ✅ Complete |
| Projects | `projects.html` | ✅ Complete |
| Skills | `skills.html` | ✅ Complete |
| Articles & Docs | `articles.html` | ✅ Complete |
| Media | `media.html` | ✅ Complete |
| Contact | `contact.html` | ✅ Complete |

---

## Tech stack

| Tool | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 | Layout, theming, animations, responsive design |
| JavaScript (ES6) | Interactivity, scroll animations, editor system |
| Google Fonts — Syne + JetBrains Mono | Heading and monospace typefaces |
| Firebase Realtime Database | Dynamic text — articles, edits, comments, likes |
| Firebase Storage | Dynamic image uploads — photos, design work |
| GitHub | Version control + source of truth for code |
| GitHub Pages | Free static hosting — serves HTML/CSS/JS |
| YouTube (embed) | Video content — no storage cost, unlimited |
| VS Code + Live Server | Local development |

---

## Storage architecture

Each type of content lives in the service best suited to it:

| Content type | Where it lives | Why |
|---|---|---|
| Site code (HTML/CSS/JS) | GitHub repo | That's exactly what GitHub is for |
| Static docs (CV, PDFs, AutoCAD exports) | `assets/docs/` in repo | Committed once, never changes |
| Profile photo, static card images | `assets/images/` in repo | Small, committed once |
| Dynamic text (articles, edits, comments) | Firebase Realtime Database | Survives device crash; 1 GB free ≈ 500 million words |
| Dynamic image uploads (photos, designs) | Firebase Storage | 5 GB free; owner uploads from browser |
| Videos | YouTube (embedded) | Unlimited; best quality; zero bandwidth cost |

**Why not store everything on GitHub?**
GitHub is a code repository, not a file host. It tolerates small assets committed once, but files over 100 MB are blocked entirely, large files slow down every `git clone`, and there is no way to upload files from the browser at runtime. Firebase handles everything dynamic.

**Firebase free tier — honest limits:**

| Service | Free limit | What it means in practice |
|---|---|---|
| Realtime Database | 1 GB stored data | 1 GB of text ≈ 500 million words. Effectively unlimited for a portfolio. |
| Firebase Storage | 5 GB stored files | Comfortably holds hundreds of full-resolution photos and design exports. |
| Storage downloads | 1 GB / day | ~200–400 image loads per day before throttling. Fine for a personal portfolio. |
| Hosting bandwidth | 10 GB / month | Not used — site is hosted on GitHub Pages. |

**The combination of Firebase + GitHub + YouTube = effectively unlimited storage at zero cost.** Each service does what it was built for. Nothing is wasted.

---

## Owner editing system

The site has a built-in CMS. Every piece of visible text is editable directly in the browser — no back-end, no dashboard, no separate admin panel.

### How to edit content

1. Click the **🔒 OWNER** button (bottom-right of any page)
2. Enter your passphrase
3. Click any text on the page — it becomes editable in-place
4. A **Format Bar** appears when you select text — drag it anywhere on screen; it remembers where you left it
5. Click **SAVE** in the editing toolbar to persist your changes to `localStorage`
6. Click **LOCK** when finished

### What the editing system stores

| Data | Storage | Persists across |
|---|---|---|
| Text edits (`data-edit-id` fields) | `localStorage` per page | Browser restarts, navigation |
| Dynamically added cards | `localStorage` `__dynamic__` key | Browser restarts, navigation |
| Media collections (photos, designs) | `localStorage` per collection | Browser restarts |
| Format bar position and pin state | `localStorage` | Browser restarts, page navigation |
| Owner session | `sessionStorage` | Current browser session only (expires on tab close) |

> **Note:** `localStorage` is per-device and per-browser. Changes made on your laptop will not automatically appear on another device. Firebase sync (Phase 3) will fix this.

### Format bar — drag and pin

| Action | Result |
|---|---|
| Grab the top handle and drag | Moves bar anywhere on screen |
| Click 📌 | Pins bar at current position — stops it jumping on new selections |
| Click 📍 (when pinned) | Unpins — bar resumes following your text selection |
| Double-click the handle | Resets bar to default centre position and unpins |
| Position is saved automatically | Bar remembers position across page loads |

---

## Media page — collection system

Photography and Graphic Design tabs each hold **unlimited images** in a single collection card:

- **Preview** — cycles randomly through your uploaded images (Ken Burns effect)
- **VIEW ALL →** — opens a full-screen gallery with every image and its caption
- **+ ADD PHOTOS / + ADD DESIGNS** — opens the OS file picker (multi-select, up to 4 MB per image)
- Each image has an **editable side note / caption** directly beneath it in the gallery
- Click any image in the gallery to open fullscreen; swipe or use arrow keys to navigate

Video and Social content remain as individual cards — each represents a specific unique piece of content rather than a batch of similar images.

---

## Responsive design — device coverage

The site is tested and optimised across the full device range:

| Breakpoint | Target devices |
|---|---|
| 320 – 360px | Small Android phones, iPhone SE (1st gen) |
| 361 – 480px | Standard phones portrait |
| 481 – 600px | Large phones, small phones landscape |
| 601 – 900px | Tablet portrait, large phones landscape |
| 901 – 1279px | Tablet landscape, small laptops, Chromebooks |
| 1280 – 1439px | Standard laptops |
| 1440 – 1919px | Large laptops, standard desktop monitors |
| 1920 – 2559px | Full HD / smart TVs / wide desktop |
| 2560 – 3839px | 2K / QHD monitors |
| 3840px+ | 4K displays |

All interactive elements meet the 44×44 px minimum touch target size. `viewport-fit=cover` and `env(safe-area-inset-*)` handle notched and Dynamic Island iPhones.

---

## Themes

| Theme | Trigger | Description |
|---|---|---|
| Dark (default) | System default | Deep navy `#0d1526`, amber `#F0A500` accent, blueprint grid |
| Light | Settings panel (⚙) | Slate `#adb6c8` background, white cards, teal accent |

The settings panel (⚙ button, top-left) also controls font size scaling.

---

## Deployment — GitHub Pages

```bash
# First deploy
git add .
git commit -m "feat: initial portfolio deployment"
git push origin main
# Then: GitHub → repo Settings → Pages → Source: Deploy from branch → main → / (root)

# Every subsequent update
git add .
git commit -m "fix: update about page text"
git push origin main
# Changes go live in ~60 seconds
```

**Custom domain (optional):**
1. Add a `CNAME` file to the repo root containing your domain: `www.rubuimwangi.com`
2. Set the DNS A records at your registrar to GitHub Pages IPs
3. Enable HTTPS in repo Settings → Pages

---

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Homepage, shared CSS/JS, design system | ✅ Done |
| 2 | All pages, responsive system, media collections, editor system | ✅ Done |
| 3 | Firebase integration — dynamic text sync, image uploads, comments | 🔵 Next |
| 4 | Contact form (Firebase or Formspree), analytics | 🔲 Planned |
| 5 | Custom domain, SEO meta tags, social preview images | 🔲 Planned |

---

## Phase 3 — Firebase integration plan

### What Firebase handles

| Data | Firebase service | Notes |
|---|---|---|
| Article content, edits | Realtime Database | Syncs across devices in real time |
| Comments and likes | Realtime Database | Per-article, per-project |
| Photo collections | Storage + Realtime DB | File in Storage; metadata (caption, order) in DB |
| Design collections | Storage + Realtime DB | Same pattern |
| CV / PDF uploads | Storage | Owner uploads once; visitors download |

### Integration approach

1. **Add Firebase SDK** via CDN — no build step, no npm, works directly in the HTML files
2. **Auth** — Firebase Anonymous Auth for visitors (like counting); Email/Password for owner
3. **Editor writes to Firebase** instead of `localStorage` — same editor UX, cloud persistence
4. **Collections** — `addToCollection()` uploads file to Firebase Storage, writes metadata to Realtime DB
5. **Visitors read** from Firebase — article content, comments rendered from DB on page load
6. **Fallback** — if Firebase is unreachable, `localStorage` values are used (graceful degradation)

### Firebase project setup (when ready)

```bash
# No npm needed — using CDN
# 1. Go to console.firebase.google.com
# 2. Create project: "rubui-portfolio"
# 3. Add a Web App — copy the firebaseConfig object
# 4. Enable: Realtime Database, Storage, Authentication (Anonymous + Email)
# 5. Paste firebaseConfig into js/firebase-config.js (gitignored)
```

> **Security note:** The Firebase config object (API key, project ID etc.) is safe to expose in client-side code — it identifies your project but does not grant access. Access is controlled by Firebase Security Rules, not by keeping the config secret.

---

## Build log

### Phase 2 — All pages + full feature set
**Completed:** May 2025

**What was built:**
- All 7 pages: Home, About, Projects, Skills, Articles, Media, Contact
- Shared responsive system — 10 breakpoints from 320px phones to 4K TVs
- Owner editing system — in-browser CMS with passphrase lock, `localStorage` persistence, dynamic card add/restore
- Format bar — draggable, pinnable, position-persisted Word-style text formatting toolbar
- Media page collection system — Photography and Graphic Design hold unlimited images with slideshow preview and full gallery overlay
- Dark/Light theme toggle with fully distinct colour layers
- `viewport-fit=cover` + `env(safe-area-inset-*)` for notched iPhones
- Firebase integration plan finalised — ready for Phase 3

**Key design decisions:**

| Decision | Choice | Reason |
|---|---|---|
| Framework | Vanilla HTML/CSS/JS | No build step, GitHub Pages compatible, full control |
| Hosting | GitHub Pages | Free, ties to repo, looks professional on CV |
| Dynamic storage | Firebase (Phase 3) | Only viable option for browser-side dynamic uploads |
| Video | YouTube embed | Unlimited, zero cost, best quality |
| Theme | Dark navy + amber | Engineering blueprint aesthetic — distinct from generic portfolios |
| Fonts | Syne + JetBrains Mono | Geometric heading + technical monospace |

---

### Phase 1 — Foundation
**Completed:** Early 2025

Built `index.html`, `css/style.css`, `js/main.js`. Established design system, folder structure, and GitHub Pages deployment.

---

*Portfolio by Rubui Mwangi — BSc Electrical & Electronics Engineering, JKUAT.*
