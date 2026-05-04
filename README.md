# Portfolio — Electrical Engineer

> A personal portfolio website built from scratch using HTML, CSS, and JavaScript.  
> Documenting the full build process as a learning exercise.

**Live site:** [yourusername.github.io/portfolio](https://yourusername.github.io/portfolio)  
**Status:** 🟡 In progress — Phase 1 complete

---

## Build log

### Entry #1 — Project setup & homepage
**Date:** [Today's date]  
**Phase:** 1 — Foundation

#### What was built
- Defined the full site architecture: 6 pages (Home, About, Projects, Skills, Articles, Media, Contact)
- Created the folder structure
- Chose the tech stack: pure HTML / CSS / JavaScript, hosted on GitHub Pages
- Defined the design language: Technical Blueprint — dark navy, amber grid, monospaced labels
- Built `index.html` (homepage) and `css/style.css` (shared stylesheet) and `js/main.js` (shared script)

#### Design decisions made
| Decision | Choice | Reason |
|---|---|---|
| Framework | Vanilla HTML/CSS/JS | Learn fundamentals, no build step, easy GitHub Pages deploy |
| Hosting | GitHub Pages | Free, ties directly to the repo, URL on CV |
| Visual theme | Dark blueprint | Differentiates from generic portfolios; fits engineering identity |
| Font: headings | Syne (Google Fonts) | Strong, geometric — modern engineering feel |
| Font: labels/nav | JetBrains Mono | Code/technical aesthetic; reinforces engineering theme |
| Accent colour | #DAA520 amber/gold | Engineering drawing colour; visible on dark background |
| Grid lines | 28px, amber at 6% opacity | Subtle graph-paper texture without overwhelming content |

#### Key HTML/CSS concepts learned
- **CSS custom properties (variables):** All colours, fonts, and spacing values are defined once in `:root {}` and reused across the whole stylesheet. Change one variable and the entire site updates.
- **Sticky navigation:** `position: sticky; top: 0` keeps the nav bar visible as you scroll, with `backdrop-filter: blur()` creating a frosted-glass effect.
- **CSS Grid:** The stats strip and nav card grid use `display: grid` with `grid-template-columns` to create responsive multi-column layouts without JavaScript.
- **Semantic HTML:** Using `<header>`, `<nav>`, `<section>`, `<footer>` instead of `<div>` everywhere helps search engines and accessibility tools understand the page structure.
- **Scripts at the bottom:** JavaScript `<script>` tags placed at the end of `<body>` ensure the HTML loads and renders before JS runs.
- **IntersectionObserver API:** Used in `main.js` to detect when elements scroll into view, triggering animations only when the user can actually see them.

#### Files created this session
```
portfolio/
├── index.html        ← homepage (complete)
├── css/
│   └── style.css     ← shared styles (complete)
├── js/
│   └── main.js       ← shared scripts (complete)
├── assets/
│   ├── images/       ← empty, ready for photos
│   ├── docs/         ← empty, ready for PDFs/AutoCAD exports
│   └── videos/       ← empty, ready for video clips
└── README.md         ← this file
```

#### Git commands used
```bash
git init
git add .
git commit -m "Initial commit — project structure"
git remote add origin https://github.com/YOURUSERNAME/portfolio.git
git push -u origin main
```

#### What's next — Phase 2
- [ ] `about.html` — bio, education, downloadable CV
- [ ] `projects.html` — card grid with file downloads
- [ ] `skills.html` — animated skill bars
- [ ] Deploy to GitHub Pages

---

*This build log is also published at: [yoursite.com/articles.html]()*

---

## Tech stack

| Tool | Purpose |
|---|---|
| HTML5 | Page structure and content |
| CSS3 | Styling, layout, animations |
| JavaScript (ES6) | Interactivity, scroll animations |
| Google Fonts | Syne + JetBrains Mono typefaces |
| GitHub | Version control + hosting |
| GitHub Pages | Free static site hosting |
| VS Code | Code editor |
| Live Server (VS Code extension) | Local development preview |

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | ✅ Complete |
| About | `about.html` | 🔲 Next |
| Projects | `projects.html` | 🔲 Planned |
| Skills | `skills.html` | 🔲 Planned |
| Articles & Docs | `articles.html` | 🔲 Planned |
| Media | `media.html` | 🔲 Planned |
| Contact | `contact.html` | 🔲 Planned |
