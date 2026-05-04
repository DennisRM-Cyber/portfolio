/* ============================================================
   PORTFOLIO — ELECTRICAL ENGINEER
   main.js  |  shared across all pages

   What this file does:
   1. Marks the current page's nav link as "active"
   2. Handles the mobile hamburger menu toggle
   3. Animates skill bars when they scroll into view
   ============================================================ */


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
