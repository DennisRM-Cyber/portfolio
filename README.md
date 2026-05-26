# Rubui Mwangi — Portfolio

> Personal portfolio website built from scratch using HTML, CSS, and JavaScript.
> Electrical & Electronics Engineer · JKUAT Graduate · Nairobi, Kenya.

**Live site:** [rubuimwangi.github.io/portfolio](https://rubuimwangi.github.io/portfolio)
**Status:** 🔵 Phase 3 in progress — Firebase integration

---

## Quick start (local development)

```bash
# 1. Clone the repo
git clone https://github.com/rubuimwangi/portfolio.git
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
│   ├── firebase.js       ← Firebase shared module (window.PF)
│   ├── main.js           ← Shared scripts (nav, scroll, animations)
│   └── editor.js         ← Owner-only editing system + Firebase auth bridge
│
├── assets/
│   ├── images/           ← Static profile photo and card images (committed once)
│   ├── docs/             ← CVs, PDFs, AutoCAD exports (committed once, never changes)
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
| Firebase Realtime Database | Dynamic text — articles, edits, comments, global likes |
| Firebase Authentication | Owner email/password login for write access |
| Cloudinary (free tier) | Dynamic image uploads — photos and design work (25 GB free) |
| GitHub | Version control + source of truth for code |
| GitHub Pages | Free static hosting — serves HTML/CSS/JS |
| YouTube (embed) | Video content — unlimited, zero storage cost |
| VS Code + Live Server | Local development |

---

## Storage architecture

Each type of content lives in the service best suited to it:

| Content type | Where it lives | Why |
|---|---|---|
| Site code (HTML/CSS/JS) | GitHub repo | That's exactly what GitHub is for |
| Static docs (CV, PDFs, AutoCAD exports) | `assets/docs/` in repo | Committed once, never changes, 100 MB/file limit is fine |
| Static images (profile photo, card thumbnails) | `assets/images/` in repo | Small, committed once |
| Dynamic text (articles, edits, comments, likes) | Firebase Realtime Database | Survives device crash; 1 GB free ≈ 500 million words |
| Dynamic image uploads (photos, design work) | Cloudinary | 25 GB free; direct browser uploads; auto-compression; permanent URLs |
| Videos | YouTube (embedded) | Unlimited; best quality; zero bandwidth cost |

**Why Cloudinary and not Firebase Storage?**
Firebase Storage requires upgrading to the Blaze (pay-as-you-go) plan — it is not available on the free Spark plan.
Cloudinary's free tier provides 25 GB storage and 25 GB/month bandwidth, purpose-built for images, with no credit card required.
The image URL returned by Cloudinary is stored in Firebase Realtime Database. Clean separation of concerns.

**Firebase free tier — actual limits:**

| Service | Free limit | What it means in practice |
|---|---|---|
| Realtime Database | 1 GB stored data | 1 GB of text ≈ 500 million words. Effectively unlimited for a portfolio. |
| Authentication | Unlimited users | No limit on owner accounts or anonymous sessions. |
| Hosting bandwidth | 10 GB / month | Not used — site is hosted on GitHub Pages. |

**The combination of Firebase + Cloudinary + GitHub + YouTube = effectively unlimited storage at zero cost.**

---

## Owner editing system

The site has a built-in CMS. Every piece of visible text is editable directly in the browser — no back-end, no separate admin panel.

### How to edit content

1. Click the **🔒 OWNER** button (bottom-right of any page)
2. Enter your passphrase
3. If your Firebase session has expired, a second sign-in prompt appears — enter your owner email and password (this is the second security layer protecting write access to the database)
4. Click any text on the page — it becomes editable in-place
5. A **Format Bar** appears when you select text — drag it anywhere on screen; position is remembered across page loads
6. Click **SAVE** in the editing toolbar to write changes to Firebase
7. Click **LOCK** when finished — signs out of Firebase immediately

### Dual authentication — why two layers?

| Layer | What it controls | Technology |
|---|---|---|
| Passphrase (`blueprint2025`) | Shows/hides the editing UI | `sessionStorage` — expires when tab closes |
| Firebase email/password | Grants write access to the database | Firebase Auth — persists across browser restarts |

Both must be valid to save. If you forget one, the other still works as a fallback:
- Firebase session is still active → UI auto-restores on passphrase entry
- Firebase session expired → sign-in prompt appears after passphrase unlock

Public visitors can always read all content, like articles/projects, and submit recommendations. They cannot write, edit, or delete anything.

### What the editing system stores and where

| Data | Storage | Persists across |
|---|---|---|
| Text edits (`data-edit-id` fields) | Firebase Realtime Database | All devices, all browsers, device crash |
| Article body content | Firebase Realtime Database | All devices, all browsers, device crash |
| Global likes (articles, projects) | Firebase Realtime Database | All visitors, all devices |
| Published comments / recommendations | Firebase Realtime Database | All devices, all browsers |
| Comment submissions (awaiting approval) | Firebase Realtime Database | Owner inbox |
| Dynamic image uploads (photos, designs) | Cloudinary + Firebase DB URL | All devices, all browsers |
| Format bar position | `localStorage` | This browser only (intentional — UI preference) |
| Owner session (passphrase entered) | `sessionStorage` | Current tab only — expires on close |

### Format bar — drag and pin

| Action | Result |
|---|---|
| Grab the `⠿` handle at the top and drag | Moves the bar anywhere on screen |
| Release after dragging | Pins the bar — stops it jumping to new selections |
| Double-click the handle | Resets to auto-follow mode — bar tracks your text selection again |
| Position saved automatically | Bar remembers position across page loads (localStorage) |

---

## Firebase security rules summary

Rules are set in Firebase Console → Realtime Database → Rules.

| Path | Public reads | Public writes | Owner writes |
|---|---|---|---|
| `/edits/*` | ✅ | ❌ | ✅ |
| `/articles/*` | ✅ | ❌ | ✅ |
| `/likes/*` | ✅ | ✅ (±1 only, validated) | ✅ |
| `/comments/*` | ✅ | ❌ | ✅ |
| `/submissions/*` | ❌ | ✅ (public submit) | ✅ (read + write) |
| Everything else | ❌ | ❌ | ❌ |

Likes are globally writable but server-side rules enforce that the count can only change by ±1 per write, preventing bulk manipulation.

---

## Media page — collection system

Photography and Graphic Design tabs each hold unlimited images in a single collection card:

- **Preview** — cycles randomly through uploaded images (Ken Burns effect)
- **VIEW ALL →** — opens a full-screen gallery with every image and caption
- **+ ADD PHOTOS / + ADD DESIGNS** — opens the OS file picker (multi-select)
- Each image has an editable caption directly beneath it in the gallery
- Click any image in the gallery to open fullscreen; arrow keys or swipe to navigate

Video and Social content remain as individual cards.

---

## Responsive design — device coverage

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

---

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Homepage, shared CSS/JS, design system | ✅ Done |
| 2 | All pages, responsive system, media collections, editor system | ✅ Done |
| 3a | Firebase project setup, security rules, auth bridge | ✅ Done |
| 3b | Global likes wired to Firebase (articles + projects) | 🔵 Next |
| 3c | Text edits (`data-edit-id`) migrated from localStorage to Firebase | 🔲 Planned |
| 3d | Article content migrated to Firebase | 🔲 Planned |
| 3e | Cloudinary setup + media photo uploads | 🔲 Planned |
| 3f | Comments / submissions flow | 🔲 Planned |
| 4 | Contact form (EmailJS), analytics | 🔲 Planned |
| 5 | Custom domain, SEO meta tags, social preview images | 🔲 Planned |

---

*Portfolio by Rubui Mwangi — BSc Electrical & Electronics Engineering, JKUAT.*
