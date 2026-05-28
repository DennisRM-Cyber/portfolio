# Rubui Mwangi, Portfolio

Personal portfolio site. Built from scratch in HTML, CSS, and JavaScript. No frameworks, no build tools.

**Live site:** [dennisrm-cyber.github.io/portfolio](https://dennisrm-cyber.github.io/portfolio)
**Status:** Phase 5 complete. Production ready.

---

## Quick start

```bash
git clone https://github.com/DennisRM-Cyber/portfolio.git
cd portfolio
code .
# Install the Live Server extension in VS Code, then click Go Live
```

The site always opens at `index.html`. See `.vscode/settings.json`.

---

## Project structure

```
portfolio/
├── index.html            Home page
├── about.html            Bio, experience, education
├── projects.html         Project cards with downloads
├── skills.html           Skill bars, certifications, tools
├── articles.html         Articles and build log
├── media.html            Photography, design, video, social
├── contact.html          Contact form and social links
│
├── css/
│   └── style.css         One stylesheet for the whole site
│
├── js/
│   ├── firebase.js       Firebase module (window.PF namespace)
│   ├── main.js           Nav, animations, page view tracking
│   └── editor.js         Owner editing system with dual Firebase auth
│
├── assets/
│   ├── images/           Static photos and og-preview.jpg
│   ├── docs/             CVs, PDFs, AutoCAD exports
│   └── videos/           Short clips only. Longer video goes to YouTube.
│
├── 404.html              Redirects to homepage
├── SECURITY.md           Credential setup guide (gitignored)
└── README.md             This file
```

---

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | Complete |
| About | `about.html` | Complete |
| Projects | `projects.html` | Complete |
| Skills | `skills.html` | Complete |
| Articles | `articles.html` | Complete |
| Media | `media.html` | Complete |
| Contact | `contact.html` | Complete |

---

## Tech stack

| Tool | Purpose |
|---|---|
| HTML5, CSS3, JavaScript | Everything visible |
| Firebase Realtime Database | Articles, text edits, comments, global likes, page views |
| Firebase Authentication | Owner login for database write access |
| Cloudinary | Dynamic image uploads, 25 GB free |
| GitHub Pages | Static hosting |
| YouTube embeds | Video content, unlimited |
| EmailJS | Contact form and recommendation submission notifications |
| Google Fonts: Syne + JetBrains Mono | Heading and monospace typefaces |

---

## Storage breakdown

| Content | Where | Reason |
|---|---|---|
| HTML, CSS, JS | GitHub repo | Version control |
| Static docs, CV, PDFs | `assets/docs/` | Committed once |
| Static images | `assets/images/` | Small files, committed once |
| Text edits, articles, likes, comments | Firebase Realtime DB | Survives any device crash. 1 GB free equals roughly 500 million words. |
| Photo and design uploads | Cloudinary | 25 GB free. Direct browser upload. Auto compression. Permanent URLs. |
| Videos | YouTube | Unlimited. Zero cost. |

Firebase Storage is not used. It requires a paid plan. Cloudinary replaces it at no cost.

---

## Owner editing system

Every visible text field on the site is editable directly in the browser. No separate admin panel needed.

### How to edit

1. Click **OWNER** bottom right on any page
2. Enter your passphrase
3. If your Firebase session expired, a second prompt asks for email and password
4. Click any text to edit it in place
5. A format bar appears on text selection. Drag it anywhere. It remembers its position.
6. Click **SAVE CHANGES** to write to Firebase
7. Click **LOCK** when done. Signs out of Firebase immediately.

### Two auth layers

| Layer | What it controls |
|---|---|
| Passphrase | Shows the editing UI |
| Firebase email and password | Grants database write access |

Both need to be valid to save. If you forget one, the other still works as a recovery path. See `SECURITY.md`.

### Where data lives

| Data | Storage |
|---|---|
| All text edits | Firebase Realtime DB |
| Article content | Firebase Realtime DB |
| Global likes | Firebase Realtime DB |
| Published comments | Firebase Realtime DB |
| Recommendation submissions | Firebase Realtime DB |
| Photo and design collections | Cloudinary URL + Firebase metadata |
| Format bar position | localStorage (device preference, intentional) |
| Editor session | sessionStorage (expires on tab close) |

---

## Firebase security rules

| Path | Public reads | Public writes | Owner writes |
|---|---|---|---|
| `/edits/` | Yes | No | Yes |
| `/articles/` | Yes | No | Yes |
| `/likes/` | Yes | Yes, count changes by 1 maximum | Yes |
| `/comments/` | Yes | No | Yes |
| `/submissions/` | No | Yes | Yes |
| `/collections/` | Yes | No | Yes |
| `/pageviews/` | Yes | Yes, increment only | Yes |
| Everything else | No | No | No |

---

## Page view tracking

Every page load increments a counter in Firebase under `pageviews/<pagename>`. No IP address or personal data stored. When you unlock owner mode, a stats panel appears bottom left with view counts and a bar chart for all seven pages. Visitors never see it.

---

## Media collections

Upload flow: file picker opens, each image goes to Cloudinary, the returned URL saves to Firebase. The gallery updates in real time across all devices. Supports fullscreen view, keyboard and swipe navigation, and editable captions.

File size limit is 10 MB per image. No cap on number of images.

---

## Responsive design

Ten breakpoints from 320 px phones to 4K displays. All touch targets meet the 44x44 px minimum. Safari notch and Dynamic Island handled via `viewport-fit=cover`.

---

## Deployment

```bash
git add .
git commit -m "update: describe what changed"
git push origin main
# Live in roughly 60 seconds
```

GitHub Pages serves from the `main` branch root. No build step required.

**Custom domain setup when ready:**
1. Add a `CNAME` file to the repo root with your domain on one line
2. Set DNS A records at your registrar to GitHub Pages IPs
3. Enable HTTPS in repo Settings > Pages
4. Find and replace `dennisrm-cyber.github.io/portfolio` with your domain across all HTML files

---

## Phase history

| Phase | What was built | Status |
|---|---|---|
| 1 | Homepage, CSS, design system | Done |
| 2 | All pages, editor, responsive system, media collections | Done |
| 3 | Full Firebase integration: likes, edits, articles, Cloudinary, comments | Done |
| 4 | EmailJS contact form, social links, Firebase page analytics | Done |
| 5 | SEO meta tags, Open Graph, JSON-LD structured data, OG preview image | Done |
| Custom domain | DNS setup when domain is purchased | Next |

---

## Security

See `SECURITY.md` for passphrase setup, Firebase config notes, EmailJS domain restriction, and Cloudinary preset scope.

Short version: the Firebase API key in `firebase.js` is safe to commit. Access control is handled entirely by database rules. Your passphrase and Firebase password never appear in any file.

---

*Rubui Mwangi. BSc Electrical and Electronics Engineering, JKUAT 2025.*
