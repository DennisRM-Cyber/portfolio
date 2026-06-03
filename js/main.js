/* ============================================================
   PORTFOLIO — ELECTRICAL ENGINEER
   main.js  |  shared across all pages

   What this file does:
   1. Marks the current page's nav link as "active"
   2. Handles the mobile hamburger menu toggle
   3. Animates skill bars when they scroll into view
   ============================================================ */



/* ── 0. NAV INJECTION ─────────────────────────────────────────
   Single source of truth for the navigation bar.
   If the page has no <nav class="nav"> yet, this function
   creates and inserts one before the first <body> child,
   keeping every page's nav in sync with a single edit here.

   Backward-compatible: pages that already ship a hardcoded nav
   are untouched (the check at the top returns early).
──────────────────────────────────────────────────────────────── */
(function injectNav() {
  if (document.querySelector('nav.nav')) return; /* already present */

  var NAV_HTML = [
    '<nav class="nav">',
    '  <div class="container nav__inner">',
    '    <a href="index.html" class="nav__logo"><span>// </span>Portfolio.EE<span> _</span></a>',
    '    <button class="nav__toggle" aria-label="Toggle navigation" aria-expanded="false">',
    '      <span></span><span></span><span></span>',
    '    </button>',
    '    <ul class="nav__links">',
    '      <li><a href="index.html"    data-i18n="nav.home">home</a></li>',
    '      <li><a href="about.html"    data-i18n="nav.about">about</a></li>',
    '      <li><a href="projects.html" data-i18n="nav.projects">projects</a></li>',
    '      <li><a href="skills.html"   data-i18n="nav.skills">skills</a></li>',
    '      <li><a href="articles.html" data-i18n="nav.articles">articles</a></li>',
    '      <li><a href="media.html"    data-i18n="nav.media">media</a></li>',
    '      <li><a href="contact.html"  data-i18n="nav.contact">contact</a></li>',
    '    </ul>',
    '  </div>',
    '</nav>'
  ].join('\n');

  var tmp = document.createElement('div');
  tmp.innerHTML = NAV_HTML;
  var navEl = tmp.firstElementChild;

  /* Insert as the very first child of <body> */
  document.body.insertBefore(navEl, document.body.firstChild);
})();

/* ── 1. ACTIVE NAV LINK ───────────────────────────────────── 
   The browser knows what page it's on via window.location.
   We compare that to each nav link's href and add the
   "active" class to the matching one.
   This runs on every page automatically.
──────────────────────────────────────────────────────────── */
(function markActiveLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav__links a');

  navLinks.forEach(function(link) {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
    // Special case: if we're at the root (/), mark index.html active
    if (currentPage === '' && linkPage === 'index.html') {
      link.classList.add('active');
    }
  });
})();


/* ── 2. MOBILE HAMBURGER MENU ─────────────────────────────── 
   On small screens the nav links are hidden.
   Clicking the hamburger button toggles the "open" class,
   which CSS uses to show/hide the links.
──────────────────────────────────────────────────────────── */
(function initMobileMenu() {
  const toggle = document.querySelector('.nav__toggle');
  const links  = document.querySelector('.nav__links');

  if (!toggle || !links) return;

  toggle.addEventListener('click', function() {
    links.classList.toggle('open');
    // Accessibility: tell screen readers whether menu is expanded
    const isOpen = links.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu if user clicks a nav link (on mobile)
  links.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
    }
  });
})();


/* ── 3. SKILL BAR ANIMATION ───────────────────────────────── 
   Each skill bar starts at width:0 (set in CSS).
   When it scrolls into the viewport, we read its
   data-level attribute and animate the fill to that width.
   
   Usage in HTML:
   <div class="skill-bar__fill" data-level="85"></div>
   (data-level = percentage, 0–100)
──────────────────────────────────────────────────────────── */
(function initSkillBars() {
  const fills = document.querySelectorAll('.skill-bar__fill');
  if (!fills.length) return;

  // IntersectionObserver fires when an element enters the viewport
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const fill  = entry.target;
        const level = fill.getAttribute('data-level') || '0';
        fill.style.width = level + '%';
        observer.unobserve(fill); // animate only once
      }
    });
  }, { threshold: 0.3 });

  fills.forEach(function(fill) {
    observer.observe(fill);
  });
})();


/* ── 4. FADE-IN ON SCROLL (optional enhancement) ──────────── 
   Add class="fade-in" to any element you want to appear
   smoothly when scrolled into view.
   CSS needed (already in style.css):
     .fade-in { opacity: 0; transform: translateY(18px); transition: opacity 0.6s, transform 0.6s; }
     .fade-in.visible { opacity: 1; transform: translateY(0); }
──────────────────────────────────────────────────────────── */
(function initFadeIn() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(function(el) {
    observer.observe(el);
  });
})();


/* ── 5. PAGE VIEW TRACKING ────────────────────────────────────
   Increments the view counter for the current page in Firebase
   on every load. No personal data stored — count only.

   Owner stats panel: when editing mode is active a small panel
   bottom-left shows view counts for every page.
   Visitors never see it.
──────────────────────────────────────────────────────────── */
(function initPageViews() {
  if (!window.PF) return;

  /* Track this page load */
  var page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  PF.trackPageView(page);

  /* Owner stats panel — built once, shown on ownerUnlocked event */
  var panelBuilt = false;

  function buildStatsPanel() {
    if (panelBuilt) return;
    panelBuilt = true;

    var panel = document.createElement('div');
    panel.id  = 'pv-panel';
    panel.style.cssText = [
      'position:fixed;bottom:64px;left:12px;z-index:8000',
      'background:rgba(13,21,38,0.96)',
      'border:1px solid rgba(240,165,0,0.25)',
      'border-radius:8px;padding:10px 14px',
      'font:700 10px/1.6 JetBrains Mono,monospace',
      'color:rgba(240,165,0,0.7)',
      'min-width:160px',
      'pointer-events:none;display:none'
    ].join(';');
    document.body.appendChild(panel);

    var PAGES = {
      index:'Home', about:'About', projects:'Projects',
      skills:'Skills', articles:'Articles', media:'Media', contact:'Contact'
    };

    PF.watchPageViews(function(counts) {
      var maxVal = Math.max.apply(null, Object.keys(PAGES).map(function(p) {
        return counts[p] || 0;
      }).concat([1]));

      var html = '<div style="color:rgba(240,165,0,0.45);margin-bottom:6px;letter-spacing:1px;">// PAGE VIEWS</div>';
      Object.keys(PAGES).forEach(function(p) {
        var n     = counts[p] || 0;
        var width = Math.round((n / maxVal) * 60);
        var hilight = (p === page) ? 'color:#f0a500;' : '';
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' +
                  '<span style="width:52px;' + hilight + '">' + PAGES[p] + '</span>' +
                  '<div style="width:' + width + 'px;height:4px;background:rgba(240,165,0,0.35);border-radius:2px;"></div>' +
                  '<span style="' + hilight + '">' + n + '</span>' +
                '</div>';
      });
      panel.innerHTML = html;
    });
  }

  /* Show / hide on owner unlock / lock events dispatched by editor.js */
  document.addEventListener('ownerUnlocked', function() {
    buildStatsPanel();
    var p = document.getElementById('pv-panel');
    if (p) p.style.display = '';
  });
  document.addEventListener('ownerLocked', function() {
    var p = document.getElementById('pv-panel');
    if (p) p.style.display = 'none';
  });
})();
