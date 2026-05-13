/* ============================================================
   editor.js — v4
   Owner Lock · Inline Edit · Format Bar · Add Cards ·
   Universal Delete · Settings Panel · Slideable Skill Bars
============================================================ */

(function initEditor() {

  /* ── CONFIG ─────────────────────────────────────────────── */
  var OWNER_PASSPHRASE = 'blueprint2025';
  var SESSION_KEY      = 'portfolio__owner__unlocked';
  var SETTINGS_KEY     = 'portfolio__settings';


  /* ══════════════════════════════════════════════════════════
     PART 0 — SETTINGS PANEL
  ══════════════════════════════════════════════════════════ */

  // Inject settings button
  var settingsBtn = document.createElement('button');
  settingsBtn.className = 'settings-btn';
  settingsBtn.setAttribute('aria-label', 'Page settings');
  settingsBtn.setAttribute('title', 'Page settings');
  settingsBtn.innerHTML = '⚙';
  document.body.appendChild(settingsBtn);

  // Inject settings panel — LIGHT / DARK only for contrast
  var settingsPanel = document.createElement('div');
  settingsPanel.className = 'settings-panel';
  settingsPanel.setAttribute('role', 'dialog');
  settingsPanel.setAttribute('aria-label', 'Page settings');
  settingsPanel.innerHTML = [
    '<div class="settings-panel__title">// PAGE SETTINGS</div>',

    '<div class="settings-group">',
    '  <span class="settings-group__label">CONTRAST</span>',
    '  <div class="contrast-btns">',
    '    <button class="contrast-btn" data-contrast="light" title="Light — bright warm grey background">☀ LIGHT</button>',
    '    <button class="contrast-btn" data-contrast="dark"  title="Dark — original deep navy">🌙 DARK</button>',
    '  </div>',
    '</div>',

    '<div class="settings-group">',
    '  <span class="settings-group__label">FONT SIZE</span>',
    '  <div class="fontsize-btns">',
    '    <button class="fontsize-btn" data-size="small"  style="font-size:10px">A</button>',
    '    <button class="fontsize-btn" data-size="medium" style="font-size:13px">A</button>',
    '    <button class="fontsize-btn" data-size="large"  style="font-size:16px">A</button>',
    '  </div>',
    '</div>',

    '<div class="settings-group">',
    '  <div class="settings-toggle">',
    '    <span class="settings-toggle__label">REDUCE ANIMATIONS</span>',
    '    <label class="toggle-switch">',
    '      <input type="checkbox" id="toggle-motion" />',
    '      <span class="toggle-switch__track"></span>',
    '    </label>',
    '  </div>',
    '</div>',

    '<div class="settings-group">',
    '  <span class="settings-group__label">LANGUAGE</span>',
    '  <div class="contrast-btns">',
    '    <button class="contrast-btn lang-btn" data-lang="en">EN</button>',
    '    <button class="contrast-btn lang-btn" data-lang="sw">SW</button>',
    '  </div>',
    '</div>',
  ].join('');
  document.body.appendChild(settingsPanel);

  // ── TRANSLATION MAP ──────────────────────────────────────
  // data-i18n attributes on elements get swapped on language change.
  // Add data-i18n="key" to any HTML element you want translated.
  // Keys below cover the shared nav and footer — page-specific
  // text uses data-edit-id and gets translated via the map too.
  var translations = {
    en: {
      // Nav
      'nav.home':     'home',
      'nav.about':    'about',
      'nav.projects': 'projects',
      'nav.skills':   'skills',
      'nav.articles': 'articles',
      'nav.media':    'media',
      'nav.contact':  'contact',
      // Hero (index)
      'hero.label':    '// electrical engineer — class of 2025',
      'hero.subtitle': 'BSc Electrical & Electronics Engineering · JKUAT · Open to internship',
      'hero.btn1':     'VIEW PROJECTS',
      'hero.btn2':     'DOWNLOAD CV',
      // Footer
      'footer.status': 'OPEN TO OPPORTUNITIES',
      // About
      'about.label':   '// about',
      'about.btn1':    'DOWNLOAD CV',
      'about.btn2':    'GET IN TOUCH',
      // Settings panel labels
      'settings.contrast':    'CONTRAST',
      'settings.fontsize':    'FONT SIZE',
      'settings.motion':      'REDUCE ANIMATIONS',
      'settings.language':    'LANGUAGE',
    },
    sw: {
      // Nav
      'nav.home':     'nyumbani',
      'nav.about':    'kuhusu',
      'nav.projects': 'miradi',
      'nav.skills':   'ujuzi',
      'nav.articles': 'makala',
      'nav.media':    'midia',
      'nav.contact':  'wasiliana',
      // Hero (index)
      'hero.label':    '// mhandisi wa umeme — darasa la 2025',
      'hero.subtitle': 'BSc Uhandisi wa Umeme na Elektroniki · JKUAT · Natafuta internship',
      'hero.btn1':     'TAZAMA MIRADI',
      'hero.btn2':     'PAKUA CV',
      // Footer
      'footer.status': 'WAZI KWA FURSA',
      // About
      'about.label':   '// kuhusu',
      'about.btn1':    'PAKUA CV',
      'about.btn2':    'WASILIANA',
      // Settings panel labels
      'settings.contrast':    'MWANGA',
      'settings.fontsize':    'UKUBWA WA FONTI',
      'settings.motion':      'PUNGUZA MWENDO',
      'settings.language':    'LUGHA',
    }
  };

  function applyLanguage(lang) {
    var t = translations[lang] || translations['en'];
    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    // Highlight active lang button
    document.querySelectorAll('.lang-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    savedSettings.language = lang;
    saveSettings();
  }

  // Load saved settings
  var savedSettings = {};
  try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch(e) {}

  function applyContrast(val) {
    document.body.classList.remove('contrast-light', 'contrast-dark');
    document.body.classList.add('contrast-' + val);
    document.querySelectorAll('.contrast-btn:not(.lang-btn)').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-contrast') === val);
    });
    savedSettings.contrast = val;
    saveSettings();
  }

  function applyFontSize(val) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + val);
    document.querySelectorAll('.fontsize-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-size') === val);
    });
    savedSettings.fontSize = val;
    saveSettings();
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings));
  }

  // Apply on load — default is LIGHT contrast, MEDIUM font
  applyContrast(savedSettings.contrast || 'light');
  applyFontSize(savedSettings.fontSize  || 'medium');

  var motionToggle = document.getElementById('toggle-motion');
  if (savedSettings.reduceMotion) {
    motionToggle.checked = true;
    document.body.classList.add('reduce-motion');
  }
  setTimeout(function() {
    applyLanguage(savedSettings.language || 'en');
  }, 100);

  // Contrast buttons
  settingsPanel.querySelectorAll('.contrast-btn:not(.lang-btn)').forEach(function(btn) {
    btn.addEventListener('click', function() { applyContrast(btn.getAttribute('data-contrast')); });
  });

  // Font size buttons
  settingsPanel.querySelectorAll('.fontsize-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { applyFontSize(btn.getAttribute('data-size')); });
  });

  // Reduce motion
  motionToggle.addEventListener('change', function() {
    document.body.classList.toggle('reduce-motion', motionToggle.checked);
    savedSettings.reduceMotion = motionToggle.checked;
    saveSettings();
  });

  // Language buttons
  settingsPanel.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { applyLanguage(btn.getAttribute('data-lang')); });
  });

  // Toggle panel open/close
  var settingsOpen = false;
  settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    settingsOpen = !settingsOpen;
    settingsPanel.classList.toggle('open', settingsOpen);
  });
  document.addEventListener('click', function(e) {
    if (settingsOpen && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      settingsOpen = false;
      settingsPanel.classList.remove('open');
    }
  });


  /* ══════════════════════════════════════════════════════════
     PART 1 — LOCK BUTTON + OVERLAY
  ══════════════════════════════════════════════════════════ */

  var lockBtn = document.createElement('button');
  lockBtn.className = 'lock-btn';
  lockBtn.setAttribute('aria-label', 'Owner lock');
  lockBtn.innerHTML = '<span class="lock-btn__icon">🔒</span><span class="lock-btn__text">OWNER</span>';
  document.body.appendChild(lockBtn);

  var overlay    = document.getElementById('lock-overlay');
  var lockInput  = document.getElementById('lock-input');
  var lockSubmit = document.getElementById('lock-submit');
  var lockCancel = document.getElementById('lock-cancel');
  var lockError  = document.getElementById('lock-error');

  function openLockOverlay() {
    if (!overlay) return;
    lockInput.value = '';
    lockError.classList.remove('visible');
    lockInput.classList.remove('error');
    overlay.classList.add('visible');
    setTimeout(function() { lockInput.focus(); }, 100);
  }
  function closeLockOverlay() {
    if (overlay) overlay.classList.remove('visible');
  }
  function tryUnlock() {
    if (lockInput.value === OWNER_PASSPHRASE) {
      unlock();
      closeLockOverlay();
    } else {
      lockInput.classList.add('error');
      lockError.classList.add('visible');
      setTimeout(function() { lockInput.classList.remove('error'); }, 400);
      lockInput.value = '';
      lockInput.focus();
    }
  }

  lockBtn.addEventListener('click', function() {
    document.body.classList.contains('owner-unlocked') ? lock() : openLockOverlay();
  });
  if (lockSubmit) lockSubmit.addEventListener('click', tryUnlock);
  if (lockCancel) lockCancel.addEventListener('click', closeLockOverlay);
  if (lockInput)  lockInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') tryUnlock(); });
  if (overlay)    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeLockOverlay(); });


  /* ══════════════════════════════════════════════════════════
     PART 2 — EDIT TOOLBAR
  ══════════════════════════════════════════════════════════ */

  var toolbar = document.createElement('div');
  toolbar.className = 'edit-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.style.display = 'none';
  toolbar.innerHTML = [
    '<div class="edit-toolbar__dot" id="edit-dot"></div>',
    '<span class="edit-toolbar__label" id="edit-label">EDIT MODE</span>',
    '<button class="edit-toolbar__btn edit-toolbar__btn--toggle" id="btn-toggle">ENABLE EDITING</button>',
    '<button class="edit-toolbar__btn edit-toolbar__btn--save"   id="btn-save">SAVE CHANGES</button>',
    '<button class="edit-toolbar__btn edit-toolbar__btn--reset"  id="btn-reset">RESET</button>'
  ].join('');
  document.body.appendChild(toolbar);

  var dot       = document.getElementById('edit-dot');
  var label     = document.getElementById('edit-label');
  var btnToggle = document.getElementById('btn-toggle');
  var btnSave   = document.getElementById('btn-save');
  var btnReset  = document.getElementById('btn-reset');
  var editMode  = false;

  function getEditables() { return document.querySelectorAll('[data-edit-id]'); }

  function enableEditMode() {
    editMode = true;
    document.body.classList.add('edit-mode');
    getEditables().forEach(function(el) { el.setAttribute('contenteditable','true'); });
    document.querySelectorAll('.new-card [contenteditable]').forEach(function(el) {
      el.setAttribute('contenteditable','true');
    });
    dot.classList.add('active');
    label.classList.add('active');
    label.textContent = 'EDITING';
    btnToggle.textContent = 'STOP EDITING';
    btnToggle.classList.add('active');
    btnSave.classList.add('visible');
    btnReset.classList.add('visible');
    hideFormatBar();
  }

  function disableEditMode() {
    editMode = false;
    document.body.classList.remove('edit-mode');
    getEditables().forEach(function(el) { el.setAttribute('contenteditable','false'); });
    document.querySelectorAll('.new-card [contenteditable]').forEach(function(el) {
      el.setAttribute('contenteditable','false');
    });
    dot.classList.remove('active');
    label.classList.remove('active');
    label.textContent = 'EDIT MODE';
    btnToggle.textContent = 'ENABLE EDITING';
    btnToggle.classList.remove('active');
    btnSave.classList.remove('visible');
    btnReset.classList.remove('visible');
    hideFormatBar();
  }

  btnToggle.addEventListener('click', function() { editMode ? disableEditMode() : enableEditMode(); });


  /* ══════════════════════════════════════════════════════════
     PART 3 — SAVE / LOAD / RESET
  ══════════════════════════════════════════════════════════ */

  var pageName = window.location.pathname.split('/').pop().replace('.html','') || 'index';
  function storageKey(id) { return 'portfolio__edit__' + pageName + '__' + id; }

  function saveChanges() {
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.setItem(storageKey(id), el.innerHTML);
    });
    var dynamic = [];
    document.querySelectorAll('.new-card').forEach(function(c) { dynamic.push(c.outerHTML); });
    localStorage.setItem(storageKey('__dynamic__'), JSON.stringify(dynamic));
    btnSave.textContent = 'SAVED \u2713';
    btnSave.style.background = '#4ade80';
    setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 1800);
  }

  function loadSavedChanges() {
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) { var s = localStorage.getItem(storageKey(id)); if (s !== null) el.innerHTML = s; }
    });
  }

  btnSave.addEventListener('click', saveChanges);
  btnReset.addEventListener('click', function() {
    if (!confirm('Reset all edits on this page?')) return;
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.removeItem(storageKey(id));
    });
    localStorage.removeItem(storageKey('__dynamic__'));
    window.location.reload();
  });
  window.addEventListener('beforeunload', function() { if (editMode) saveChanges(); });
  setTimeout(loadSavedChanges, 80);


  /* ══════════════════════════════════════════════════════════
     PART 4 — UNIVERSAL DELETE
     Adds a ✕ delete button to EVERY card/block when unlocked.
     Existing cards get the button injected; new cards already have one.
  ══════════════════════════════════════════════════════════ */

  var DELETABLE_SELECTORS = [
    '.nav-card:not(.card--add)',
    '.stats__item',
    '.exp-card:not(.exp-card--add)',
    '.edu-block',
    '.project-highlight',
    '.project-card:not(.project-add-card)',
    '.skill-card',
    '.cert-card',
    '.nav-grid > a',
  ].join(', ');

  function injectDeleteBtn(el) {
    if (el.querySelector('.card-delete-btn')) return; // already has one
    if (el.classList.contains('exp-card--add') ||
        el.classList.contains('card--add') ||
        el.classList.contains('project-add-card') ||
        el.classList.contains('skill-add-card') ||
        el.classList.contains('cert-add-card')) return;

    var btn = document.createElement('button');
    btn.className = 'card-delete-btn';
    btn.setAttribute('title', 'Delete this card');
    btn.setAttribute('aria-label', 'Delete card');
    btn.innerHTML = '✕';
    // Make sure parent is positioned
    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.appendChild(btn);

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Delete this card? This cannot be undone unless you reset.')) {
        el.style.transition = 'opacity 0.25s, transform 0.25s';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)';
        setTimeout(function() { el.remove(); }, 280);
      }
    });
  }

  function injectAllDeleteBtns() {
    document.querySelectorAll(DELETABLE_SELECTORS).forEach(injectDeleteBtn);
  }


  /* ══════════════════════════════════════════════════════════
     PART 5 — SLIDEABLE SKILL BARS
     Only active when owner-unlocked. Dragging the bar or
     its thumb updates the fill width and the % label live.
  ══════════════════════════════════════════════════════════ */

  function initSlideableBars() {
    document.querySelectorAll('.skill-bar').forEach(function(bar) {
      if (bar._sliderWired) return;
      bar._sliderWired = true;

      var track   = bar.querySelector('.skill-bar__track');
      var card    = bar.closest('.skill-card');
      var pctEl   = card ? card.querySelector('.skill-card__pct') : null;
      if (!track) return;

      // Inject thumb if not already present
      var thumb = bar.querySelector('.skill-bar__thumb');
      if (!thumb) {
        thumb = document.createElement('div');
        thumb.className = 'skill-bar__thumb';
        track.appendChild(thumb);
      }

      var isDragging = false;

      function getPct(clientX) {
        var rect = bar.getBoundingClientRect();
        var pct  = Math.round(((clientX - rect.left) / rect.width) * 100);
        return Math.max(0, Math.min(100, pct));
      }

      function setLevel(pct) {
        track.style.width = pct + '%';
        track.setAttribute('data-level', pct);
        if (pctEl) pctEl.textContent = pct + '%';
      }

      function onMove(clientX) {
        if (!isDragging) return;
        setLevel(getPct(clientX));
      }

      // Mouse events
      bar.addEventListener('mousedown', function(e) {
        if (!document.body.classList.contains('owner-unlocked')) return;
        isDragging = true;
        thumb.classList.add('dragging');
        setLevel(getPct(e.clientX));
        e.preventDefault();
      });
      window.addEventListener('mousemove', function(e) { onMove(e.clientX); });
      window.addEventListener('mouseup',   function() {
        if (isDragging) { isDragging = false; thumb.classList.remove('dragging'); }
      });

      // Touch events
      bar.addEventListener('touchstart', function(e) {
        if (!document.body.classList.contains('owner-unlocked')) return;
        isDragging = true;
        thumb.classList.add('dragging');
        setLevel(getPct(e.touches[0].clientX));
        e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', function(e) {
        if (isDragging) onMove(e.touches[0].clientX);
      });
      window.addEventListener('touchend', function() {
        if (isDragging) { isDragging = false; thumb.classList.remove('dragging'); }
      });
    });
  }


  /* ══════════════════════════════════════════════════════════
     PART 6 — ADD CARDS (exp, nav, skill, cert, project)
  ══════════════════════════════════════════════════════════ */

  function makeExpCardHTML(uid) {
    return [
      '<div class="exp-card new-card fade-in visible" data-new-id="' + uid + '">',
      '  <div class="exp-card__org" contenteditable="false">ORGANISATION NAME</div>',
      '  <div class="exp-card__role" contenteditable="false">Job Title / Role</div>',
      '  <div class="exp-card__meta" contenteditable="false">Month Year \u2013 Month Year &nbsp;\u00b7&nbsp; Location</div>',
      '  <ul class="exp-card__bullets">',
      '    <li contenteditable="false">Describe what you did and the impact it had.</li>',
      '    <li contenteditable="false">Add another achievement or responsibility.</li>',
      '  </ul>',
      '</div>'
    ].join('\n');
  }

  function makeNavCardHTML(uid) {
    return [
      '<a href="#" class="nav-card new-card" data-new-id="' + uid + '">',
      '  <div class="nav-card__tag" contenteditable="false">0X / LABEL</div>',
      '  <div class="nav-card__title" contenteditable="false">Section Title</div>',
      '  <div class="nav-card__desc" contenteditable="false">Short description of this section.</div>',
      '  <span class="nav-card__arrow" aria-hidden="true">\u2197</span>',
      '</a>'
    ].join('\n');
  }

  function uid() { return 'card-' + Date.now() + '-' + Math.floor(Math.random()*9999); }

  function wireNewCard(card) {
    injectDeleteBtn(card);
    if (editMode) {
      card.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.setAttribute('contenteditable','true');
      });
    }
    // Wire skill bar if present
    var bar = card.querySelector('.skill-bar');
    if (bar) initSlideableBars();
  }

  function focusFirstField(card) {
    var f = card.querySelector('[contenteditable]');
    if (!f) return;
    f.setAttribute('contenteditable','true');
    setTimeout(function() {
      f.focus();
      var r = document.createRange();
      r.selectNodeContents(f);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
    }, 60);
  }

  function handleAddCardClick(addCard) {
    var isExp = addCard.classList.contains('exp-card--add');
    var id    = uid();
    var html  = isExp ? makeExpCardHTML(id) : makeNavCardHTML(id);
    var tmp   = document.createElement('div');
    tmp.innerHTML = html;
    var newCard = tmp.firstElementChild;
    addCard.parentNode.insertBefore(newCard, addCard);
    wireNewCard(newCard);
    if (!editMode) enableEditMode();
    focusFirstField(newCard);
  }

  function wireAddCards() {
    document.querySelectorAll('.exp-card--add, .card--add').forEach(function(btn) {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!document.body.classList.contains('owner-unlocked')) return;
        handleAddCardClick(btn);
      });
    });
  }
  wireAddCards();


  /* ══════════════════════════════════════════════════════════
     PART 7 — FLOATING FORMAT TOOLBAR
  ══════════════════════════════════════════════════════════ */

  /* ── FORMAT BAR: MS Word-style two-row ribbon ── */
  var formatBar = document.createElement('div');
  formatBar.className = 'format-bar';
  formatBar.setAttribute('role', 'toolbar');
  formatBar.setAttribute('aria-label', 'Text formatting');
  formatBar.innerHTML = [
    // ROW 1: paragraph style, font, size, colour
    '<div class="format-bar__row">',
      '<select class="format-bar__heading-select" id="fmt-heading" title="Paragraph style">',
        '<option value="">\u00b6 Normal</option>',
        '<option value="h1">Heading 1</option>',
        '<option value="h2">Heading 2</option>',
        '<option value="h3">Heading 3</option>',
        '<option value="blockquote">Quote</option>',
        '<option value="pre">Code block</option>',
      '</select>',
      '<div class="format-bar__divider"></div>',
      '<select class="format-bar__font-select" id="fmt-font" title="Font family">',
        '<option value="">Font</option>',
        "<option value="'Syne',sans-serif">Syne</option>",
        "<option value="'JetBrains Mono',monospace">Mono</option>",
        '<option value="Georgia,serif">Georgia</option>',
        '<option value="Arial,sans-serif">Arial</option>',
        "<option value="'Times New Roman',serif">Times New Roman</option>",
        "<option value="'Courier New',monospace">Courier New</option>",
      '</select>',
      '<div class="format-bar__divider"></div>',
      '<div class="format-bar__size-wrap" title="Font size (type or use arrows)">',
        '<input class="format-bar__size-input" type="number" id="fmt-size-input" min="8" max="96" value="16" />',
        '<div style="display:flex;flex-direction:column;">',
          '<button class="format-bar__size-step" id="fmt-size-up">\u25b2</button>',
          '<button class="format-bar__size-step" id="fmt-size-down">\u25bc</button>',
        '</div>',
      '</div>',
      '<div class="format-bar__divider"></div>',
      '<label class="format-bar__color-wrap" title="Text colour">',
        '<span class="format-bar__color-letter">A</span>',
        '<div class="format-bar__color-bar" id="fmt-color-bar"></div>',
        '<input type="color" id="fmt-color" value="#F0A500" />',
      '</label>',
      '<label class="format-bar__color-wrap" title="Highlight colour">',
        '<span class="format-bar__color-letter" style="color:#fbbf24">H</span>',
        '<div class="format-bar__color-bar" id="fmt-hl-bar" style="background:#fbbf24"></div>',
        '<input type="color" id="fmt-highlight" value="#fbbf24" />',
      '</label>',
    '</div>',
    // ROW 2: character + paragraph formatting
    '<div class="format-bar__row">',
      '<button class="format-bar__btn" data-cmd="bold"          title="Bold (Ctrl+B)"><b>B</b></button>',
      '<button class="format-bar__btn" data-cmd="italic"        title="Italic (Ctrl+I)"><i>I</i></button>',
      '<button class="format-bar__btn" data-cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></button>',
      '<button class="format-bar__btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>',
      '<button class="format-bar__btn" data-cmd="superscript"   title="Superscript">x<sup>2</sup></button>',
      '<button class="format-bar__btn" data-cmd="subscript"     title="Subscript">x<sub>2</sub></button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="justifyLeft"   title="Align left">\u21a4\u2005\u2261</button>',
      '<button class="format-bar__btn" data-cmd="justifyCenter" title="Centre">\u2261</button>',
      '<button class="format-bar__btn" data-cmd="justifyRight"  title="Align right">\u2261\u2005\u21a6</button>',
      '<button class="format-bar__btn" data-cmd="justifyFull"   title="Justify">\u2261\u2261</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="insertUnorderedList" title="Bullet list">\u2022\u2261</button>',
      '<button class="format-bar__btn" data-cmd="insertOrderedList"   title="Numbered list">1.</button>',
      '<button class="format-bar__btn" data-cmd="indent"              title="Indent \u2192">\u21e5</button>',
      '<button class="format-bar__btn" data-cmd="outdent"             title="Outdent \u2190">\u21e4</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="insertHorizontalRule" title="Horizontal rule">\u2014</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn format-bar__btn--clear" data-cmd="removeFormat" title="Clear formatting">\u2715 Clear</button>',
    '</div>',
  ].join('');
  document.body.appendChild(formatBar);

  var savedRange = null;

  function saveRange() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function hideFormatBar() { formatBar.classList.remove('visible'); }
  function showFormatBar(x, y) {
    // Position above selection, clamped to viewport
    var barW = Math.min(620, window.innerWidth - 16);
    var left = Math.min(x - barW/2, window.innerWidth - barW - 8);
    if (left < 8) left = 8;
    formatBar.style.left  = left + 'px';
    formatBar.style.top   = (y - 20) + 'px'; // shows above cursor
    formatBar.style.minWidth = barW + 'px';
    formatBar.classList.add('visible');
  }
  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
  }
  function execFmt(cmd, val) { restoreSelection(); document.execCommand(cmd, false, val || null); }

  function applySelectionFontSize(px) {
    restoreSelection();
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    var span = document.createElement('span');
    span.style.fontSize = px + 'px';
    try { sel.getRangeAt(0).surroundContents(span); } catch(e) {
      document.execCommand('fontSize', false, '4');
      document.querySelectorAll('font[size="4"]').forEach(function(f) {
        f.removeAttribute('size');
        f.style.fontSize = px + 'px';
        f.outerHTML = '<span style="font-size:' + px + 'px">' + f.innerHTML + '</span>';
      });
    }
  }

  // Command buttons
  formatBar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      saveRange();
      execFmt(btn.getAttribute('data-cmd'));
    });
  });

  // Heading / paragraph style
  var fmtHeading = document.getElementById('fmt-heading');
  fmtHeading.addEventListener('mousedown', saveRange);
  fmtHeading.addEventListener('change', function() {
    var val = this.value;
    if (!val) { execFmt('formatBlock', '<p>'); this.value = ''; return; }
    execFmt('formatBlock', '<' + val + '>');
    this.value = '';
  });

  // Font family
  var fmtFont = document.getElementById('fmt-font');
  fmtFont.addEventListener('mousedown', saveRange);
  fmtFont.addEventListener('change', function() { execFmt('fontName', this.value); this.value = ''; });

  // Font size input + steppers
  var fmtSizeInput = document.getElementById('fmt-size-input');
  var fmtSizeUp    = document.getElementById('fmt-size-up');
  var fmtSizeDown  = document.getElementById('fmt-size-down');
  var currentFontSize = 16;

  fmtSizeInput.addEventListener('mousedown', saveRange);
  fmtSizeInput.addEventListener('change', function() {
    var px = Math.max(8, Math.min(96, parseInt(this.value) || 16));
    this.value = px; currentFontSize = px;
    applySelectionFontSize(px);
  });
  fmtSizeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); this.dispatchEvent(new Event('change')); }
  });
  fmtSizeUp.addEventListener('mousedown', function(e) {
    e.preventDefault(); saveRange();
    currentFontSize = Math.min(96, currentFontSize + 1);
    fmtSizeInput.value = currentFontSize;
    applySelectionFontSize(currentFontSize);
  });
  fmtSizeDown.addEventListener('mousedown', function(e) {
    e.preventDefault(); saveRange();
    currentFontSize = Math.max(8, currentFontSize - 1);
    fmtSizeInput.value = currentFontSize;
    applySelectionFontSize(currentFontSize);
  });

  // Text colour
  var fmtColor    = document.getElementById('fmt-color');
  var fmtColorBar = document.getElementById('fmt-color-bar');
  fmtColor.addEventListener('mousedown', saveRange);
  fmtColor.addEventListener('input', function() {
    if (fmtColorBar) fmtColorBar.style.background = this.value;
    execFmt('foreColor', this.value);
  });

  // Highlight
  var fmtHL    = document.getElementById('fmt-highlight');
  var fmtHLBar = document.getElementById('fmt-hl-bar');
  fmtHL.addEventListener('mousedown', saveRange);
  fmtHL.addEventListener('input', function() {
    if (fmtHLBar) fmtHLBar.style.background = this.value;
    execFmt('hiliteColor', this.value);
  });
  document.addEventListener('selectionchange', function() {
    if (!editMode) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setTimeout(function() {
        if (!formatBar.matches(':hover')) hideFormatBar();
      }, 120);
      return;
    }
    var node = sel.anchorNode;
    var inEdit = false;
    while (node) {
      if (node.getAttribute && (node.getAttribute('contenteditable') === 'true' || node.getAttribute('data-edit-id'))) { inEdit = true; break; }
      node = node.parentNode;
    }
    if (!inEdit) return;
    savedRange = sel.getRangeAt(0).cloneRange();
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    showFormatBar(rect.left + window.scrollX + rect.width/2 - 280, rect.top + window.scrollY);
  });

  formatBar.addEventListener('mousedown', function() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });


  /* ══════════════════════════════════════════════════════════
     PART 8 — LOCK / UNLOCK
  ══════════════════════════════════════════════════════════ */

  function unlock() {
    document.body.classList.add('owner-unlocked');
    sessionStorage.setItem(SESSION_KEY, '1');
    toolbar.style.display = '';
    lockBtn.innerHTML = '<span class="lock-btn__icon">\uD83D\uDD13</span><span class="lock-btn__text">LOCK</span>';
    injectAllDeleteBtns();
    initSlideableBars();
    wireAddCards();
  }

  function lock() {
    document.body.classList.remove('owner-unlocked');
    sessionStorage.removeItem(SESSION_KEY);
    toolbar.style.display = 'none';
    disableEditMode();
    lockBtn.innerHTML = '<span class="lock-btn__icon">\uD83D\uDD12</span><span class="lock-btn__text">OWNER</span>';
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();


  /* ══════════════════════════════════════════════════════════
     PART 9 — KEYBOARD SHORTCUTS
  ══════════════════════════════════════════════════════════ */

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      if (document.body.classList.contains('owner-unlocked')) editMode ? disableEditMode() : enableEditMode();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && editMode) {
      e.preventDefault(); saveChanges();
    }
    if (e.key === 'Escape') {
      if (overlay && overlay.classList.contains('visible')) closeLockOverlay();
      else if (settingsOpen) { settingsOpen = false; settingsPanel.classList.remove('open'); }
      else hideFormatBar();
    }
  });

})();

/* ═══════════════════════════════════════════════════════════
   FILE UPLOAD SYSTEM — appended to editor.js
   Opens OS file explorer, reads file locally, stores base64
   in localStorage, replaces placeholder immediately.
   Shows instruction toast with correct assets/ path to push.
═══════════════════════════════════════════════════════════ */

(function initUploadSystem() {

  /* ── TOAST ──────────────────────────────────────────────── */
  var toast = document.createElement('div');
  toast.className = 'upload-toast';
  toast.innerHTML =
    '<button class="upload-toast__close" id="upload-toast-close">✕</button>' +
    '<div class="upload-toast__title" id="upload-toast-title"></div>' +
    '<div id="upload-toast-body"></div>' +
    '<div class="upload-toast__progress"><div class="upload-toast__progress-fill" id="upload-toast-bar"></div></div>';
  document.body.appendChild(toast);

  var toastTitle = document.getElementById('upload-toast-title');
  var toastBody  = document.getElementById('upload-toast-body');
  var toastBar   = document.getElementById('upload-toast-bar');
  var toastClose = document.getElementById('upload-toast-close');
  var toastTimer = null;

  toastClose.addEventListener('click', function() { hideToast(); });

  function showToast(title, bodyHtml, autoDismiss) {
    toastTitle.textContent = title;
    toastBody.innerHTML = bodyHtml;
    toastBar.style.width = '0';
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    if (autoDismiss) {
      setTimeout(function() { toastBar.style.width = '100%'; }, 50);
      toastTimer = setTimeout(hideToast, autoDismiss);
    }
  }
  function hideToast() {
    toast.classList.remove('visible');
    clearTimeout(toastTimer);
  }

  /* ── FILE STORAGE HELPERS ───────────────────────────────── */
  var UPLOAD_PREFIX = 'portfolio__upload__';
  var SIZE_LIMIT_MB = 2.5; // localStorage safe limit per file

  function uploadKey(assetPath) {
    return UPLOAD_PREFIX + assetPath.replace(/\//g, '__');
  }

  function loadStoredUploads() {
    // On page load, restore any previously uploaded files
    document.querySelectorAll('[data-asset-path]').forEach(function(el) {
      var assetPath = el.getAttribute('data-asset-path');
      var assetType = el.getAttribute('data-asset-type') || 'image';
      var stored = null;
      try { stored = localStorage.getItem(uploadKey(assetPath)); } catch(e) {}
      if (stored) applyStoredFile(el, stored, assetType, assetPath);
    });
  }

  function applyStoredFile(targetEl, dataUrl, assetType, assetPath) {
    if (assetType === 'image') {
      // Replace placeholder with the actual image
      var container = targetEl.closest('.card-media, .about-hero__img-wrap, .media-card__thumb');
      if (!container) container = targetEl.parentElement;

      // Remove existing placeholder content
      var placeholder = container.querySelector('.card-media__placeholder, .about-hero__placeholder, .media-card__placeholder');
      if (placeholder) placeholder.style.display = 'none';

      // Find or create the img element
      var img = container.querySelector('img[data-uploaded]');
      if (!img) {
        img = document.createElement('img');
        img.setAttribute('data-uploaded', '1');
        img.alt = assetPath.split('/').pop().replace(/\.[^.]+$/, '').replace(/-/g, ' ');
        container.insertBefore(img, container.firstChild);
      }
      img.src = dataUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

      // Show local badge
      var badge = container.querySelector('.upload-local-badge');
      if (badge) badge.style.display = '';

    } else if (assetType === 'pdf' || assetType === 'docx') {
      // Update the doc button src to use object URL (session only)
      // Note: can't persist object URLs — only base64 which is too large for docs
      // So for docs we just show "file selected" state
      var btn = document.querySelector('[data-doc-src="' + assetPath + '"]');
      if (btn) {
        btn.style.opacity = '1';
        btn.style.borderColor = 'rgba(74,222,128,0.4)';
      }
    }
  }

  /* ── FILE PICKER ────────────────────────────────────────── */
  function openFilePicker(accept, onFile) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function() {
      if (this.files && this.files[0]) onFile(this.files[0]);
      document.body.removeChild(input);
    });
    input.click();
  }

  function readAsDataURL(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) { callback(e.target.result); };
    reader.readAsDataURL(file);
  }

  /* ── INJECT UPLOAD ZONES ────────────────────────────────── */
  function injectUploadZones() {

    // ── IMAGES: card-media__placeholder, media-card__placeholder, about-hero__placeholder ──
    var imagePlaceholders = document.querySelectorAll(
      '.card-media__placeholder, .media-card__placeholder, .about-hero__placeholder'
    );
    imagePlaceholders.forEach(function(ph) {
      if (ph._uploadWired) return;
      ph._uploadWired = true;

      // Find the parent container and get the expected asset path
      var container = ph.closest('[data-asset-path]');
      var assetPath, assetType;

      if (container) {
        assetPath = container.getAttribute('data-asset-path');
        assetType = container.getAttribute('data-asset-type') || 'image';
      } else {
        // Derive from context
        var card = ph.closest('.project-card, .media-card, .about-hero__img-wrap');
        if (card) {
          var titleEl = card.querySelector('[data-edit-id$="-title"], .card-title, .media-card__title');
          var slug = titleEl
            ? titleEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,30)
            : 'image-' + Date.now();
          assetPath = 'assets/images/' + slug + '.jpg';
          assetType = 'image';
          container = ph;
        }
      }
      if (!assetPath) return;

      // Add upload zone overlay
      var zone = document.createElement('div');
      zone.className = 'upload-zone';
      zone.innerHTML =
        '<div class="upload-zone__icon">📁</div>' +
        '<div class="upload-zone__label">CLICK TO UPLOAD<br>IMAGE</div>' +
        '<div class="upload-zone__hint">JPG · PNG · WEBP · GIF</div>';
      ph.style.position = 'relative';
      ph.appendChild(zone);

      // Add local badge
      var badge = document.createElement('div');
      badge.className = 'upload-local-badge';
      badge.textContent = '⚡ LOCAL ONLY';
      badge.style.display = 'none';
      ph.closest('.card-media, .media-card__thumb, .about-hero__img-wrap') &&
        ph.closest('.card-media, .media-card__thumb, .about-hero__img-wrap').appendChild(badge);

      var finalAssetPath = assetPath;
      var finalAssetType = assetType;

      zone.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;

        openFilePicker('image/jpeg,image/png,image/webp,image/gif', function(file) {
          var sizeMB = file.size / (1024 * 1024);
          if (sizeMB > SIZE_LIMIT_MB) {
            showToast(
              '⚠ File too large',
              '<span class="upload-toast__warn">This image is ' + sizeMB.toFixed(1) + 'MB. ' +
              'For localStorage preview, keep images under ' + SIZE_LIMIT_MB + 'MB. ' +
              'Add the file directly to <code>' + finalAssetPath + '</code> and push to GitHub instead.</span>',
              8000
            );
            return;
          }

          readAsDataURL(file, function(dataUrl) {
            // Store in localStorage
            try {
              localStorage.setItem(uploadKey(finalAssetPath), dataUrl);
            } catch(e) {
              showToast('⚠ Storage full',
                '<span class="upload-toast__warn">Browser storage is full. Add the image directly to your assets/ folder.</span>',
                6000);
              return;
            }

            // Apply immediately
            applyStoredFile(ph, dataUrl, finalAssetType, finalAssetPath);

            // Show success toast with instructions
            var fname = file.name;
            var ext   = fname.split('.').pop().toLowerCase();
            var suggested = finalAssetPath.replace(/\.[^.]+$/, '.' + ext);
            showToast(
              '✓ Image uploaded locally',
              '<div class="upload-toast__path">Save as: ' + suggested + '</div>' +
              '<div class="upload-toast__warn">⚡ This image is stored in your browser only.<br>' +
              'To make it permanent for all visitors:<br>' +
              '1. Save the file as <strong>' + fname + '</strong><br>' +
              '2. Copy it into <strong>assets/images/</strong><br>' +
              '3. Commit and push to GitHub</div>',
              10000
            );
          });
        });
      });
    });

    // ── PDF / DOCX UPLOAD (projects page doc buttons) ──
    document.querySelectorAll('[data-doc-src]').forEach(function(btn) {
      if (btn._uploadDocWired || !btn.classList.contains('card-btn--primary')) return;
      btn._uploadDocWired = true;

      var assetPath = btn.getAttribute('data-doc-src');
      var assetType = btn.getAttribute('data-doc-type') || 'pdf';
      var docTitle  = btn.getAttribute('data-doc-title') || 'Document';

      // Add a small upload icon button next to the read button
      var uploadBtn = document.createElement('button');
      uploadBtn.className = 'card-btn owner-only';
      uploadBtn.title = 'Upload ' + assetType.toUpperCase() + ' file';
      uploadBtn.innerHTML = '<span style="font-size:11px;">📂</span> UPLOAD ' + assetType.toUpperCase();
      uploadBtn.style.display = 'none';

      if (btn.parentNode) btn.parentNode.insertBefore(uploadBtn, btn.nextSibling);

      // Show when owner unlocked
      if (document.body.classList.contains('owner-unlocked')) uploadBtn.style.display = '';

      uploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;

        var accept = assetType === 'pdf' ? 'application/pdf' : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        openFilePicker(accept, function(file) {
          // For docs: create object URL for this session and open in viewer
          var objectUrl = URL.createObjectURL(file);

          // Wire the read button to open this file
          btn.setAttribute('data-doc-src-local', objectUrl);
          btn._localObjectUrl = objectUrl;

          // Update the download link too
          var downloadBtn = btn.parentNode && btn.parentNode.querySelector('a[download][href*="' + assetPath + '"]');
          if (downloadBtn) downloadBtn.href = objectUrl;

          showToast(
            '✓ ' + assetType.toUpperCase() + ' loaded for this session',
            '<div class="upload-toast__path">File: ' + file.name + '</div>' +
            '<div class="upload-toast__warn">⚡ Session only — link works until you close the tab.<br>' +
            'To make it permanent:<br>' +
            '1. Name the file exactly: <strong>' + assetPath.split('/').pop() + '</strong><br>' +
            '2. Copy into <strong>' + assetPath.split('/').slice(0,-1).join('/') + '/</strong><br>' +
            '3. Commit and push to GitHub</div>',
            12000
          );

          // Update the doc viewer wiring on the read button
          btn.removeAttribute('data-doc-src');
          btn.setAttribute('data-doc-src', objectUrl);
          btn._docWired = false;
          if (typeof wireDocBtns === 'function') wireDocBtns();
        });
      });
    });

    // ── VIDEO UPLOAD (media page) ──
    document.querySelectorAll('[data-media-type="local"][data-media-src*="assets/"]').forEach(function(card) {
      if (card._uploadVideoWired) return;
      card._uploadVideoWired = true;

      var assetPath = card.getAttribute('data-media-src');
      var thumb = card.querySelector('.card-media__thumb, .media-card__thumb');
      if (!thumb) return;

      var zone = document.createElement('div');
      zone.className = 'upload-zone';
      zone.style.zIndex = '6';
      zone.innerHTML =
        '<div class="upload-zone__icon">🎬</div>' +
        '<div class="upload-zone__label">UPLOAD VIDEO</div>' +
        '<div class="upload-zone__hint">MP4 · MOV · WEBM</div>';
      thumb.style.position = 'relative';
      thumb.appendChild(zone);

      zone.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;

        openFilePicker('video/mp4,video/webm,video/quicktime', function(file) {
          var objectUrl = URL.createObjectURL(file);
          card.setAttribute('data-media-src', objectUrl);
          card._wired = false;

          // Also upload thumbnail option
          showToast(
            '✓ Video loaded for this session',
            '<div class="upload-toast__path">File: ' + file.name + '</div>' +
            '<div class="upload-toast__warn">⚡ Session only. To make permanent:<br>' +
            '1. Name file: <strong>' + assetPath.split('/').pop() + '</strong><br>' +
            '2. Place in <strong>assets/videos/</strong><br>' +
            '3. Commit and push to GitHub</div>',
            10000
          );
        });
      });
    });
  }

  /* ── SOCIAL LINK EDITOR ─────────────────────────────────── */
  // Adds a 🔗 edit button to every social card when unlocked
  function injectLinkEditors() {
    document.querySelectorAll('.social-card').forEach(function(card) {
      if (card._linkEditWired) return;
      card._linkEditWired = true;
      card.style.position = 'relative';

      var editBtn = document.createElement('button');
      editBtn.className = 'link-edit-btn';
      editBtn.title = 'Edit link URL';
      editBtn.textContent = '🔗';
      card.appendChild(editBtn);

      editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var current = card.getAttribute('href') || '';
        var newUrl = window.prompt('Enter the full URL for this social link:\n(e.g. https://linkedin.com/in/yourname)', current);
        if (newUrl !== null && newUrl.trim()) {
          card.setAttribute('href', newUrl.trim());
          // Persist
          var key = 'portfolio__link__' + (card.className.match(/social-\w+/)||['social'])[0];
          try { localStorage.setItem(key, newUrl.trim()); } catch(e) {}
          showToast('✓ Link updated',
            '<div class="upload-toast__path">' + newUrl.trim() + '</div>' +
            '<div class="upload-toast__warn">Saved to browser. To make permanent, update the href in contact.html and push to GitHub.</div>',
            6000);
        }
      });

      // Restore saved link
      var key = 'portfolio__link__' + (card.className.match(/social-\w+/)||['social'])[0];
      var saved = null;
      try { saved = localStorage.getItem(key); } catch(e) {}
      if (saved) card.setAttribute('href', saved);
    });
  }

  /* ── WIRE ON UNLOCK ─────────────────────────────────────── */
  // Observe body class changes to trigger wiring on unlock
  var unlockObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        if (document.body.classList.contains('owner-unlocked')) {
          injectUploadZones();
          injectLinkEditors();
          // Show owner-only doc upload buttons
          document.querySelectorAll('.card-btn[title^="Upload"]').forEach(function(b) {
            b.style.display = '';
          });
        }
      }
    });
  });
  unlockObserver.observe(document.body, { attributes: true });

  // Wire on load if already unlocked (session restore)
  if (document.body.classList.contains('owner-unlocked')) {
    injectUploadZones();
    injectLinkEditors();
  }

  // Always restore previously uploaded images on page load
  loadStoredUploads();

  /* ── EXPOSE wireDocBtns for cross-reference ─────────────── */
  // Projects page defines wireDocBtns in its own script block;
  // we reference it above. If not found that's fine — it's optional.


  /* ══════════════════════════════════════════════════════════
     PART 10 — ASSET UPLOAD SYSTEM
     ─────────────────────────────────────────────────────────
     WHAT WORKS IN THE BROWSER (GitHub Pages):
       • Images / photos → stored as base64 in localStorage ✅
       • Thumbnail previews → rendered immediately ✅

     WHAT REQUIRES GITHUB (cannot run client-side):
       • PDFs / DOCX → drop into assets/docs/ in your repo
       • Videos      → upload to YouTube or assets/videos/
       • The asset-guide panel explains this to you when you click
         a video or document placeholder while unlocked.

     HOW IT WORKS:
       On unlock, every .card-media__placeholder and
       .about-hero__placeholder gets an upload button overlay.
       Clicking it opens the OS file picker (images only for
       in-browser storage, or shows the path guide for other types).
  ══════════════════════════════════════════════════════════ */

  /* ── Inject the asset-guide panel (once) ─────────────── */
  var assetGuide = document.createElement('div');
  assetGuide.className = 'asset-guide';
  assetGuide.id = 'asset-guide';
  assetGuide.innerHTML = [
    '<div class="asset-guide__handle"></div>',
    '<div class="asset-guide__label">// ASSET UPLOAD GUIDE</div>',
    '<div class="asset-guide__title" id="asset-guide-title">Adding a file</div>',
    '<div class="asset-guide__steps" id="asset-guide-steps"></div>',
    '<button class="asset-guide__close" id="asset-guide-close">CLOSE</button>',
  ].join('');
  document.body.appendChild(assetGuide);
  document.getElementById('asset-guide-close').addEventListener('click', function() {
    assetGuide.classList.remove('open');
  });

  /* ── Inject the link/path modal (once) ──────────────── */
  var linkModal = document.createElement('div');
  linkModal.className = 'asset-link-modal';
  linkModal.id = 'asset-link-modal';
  linkModal.innerHTML = [
    '<div class="asset-link-modal__inner">',
      '<div class="asset-link-modal__title" id="alm-title">Set source link</div>',
      '<div class="asset-link-modal__sub" id="alm-sub"></div>',
      '<input class="asset-link-modal__input" id="alm-input" type="text" placeholder="Paste URL or file path…" />',
      '<div class="asset-link-modal__actions">',
        '<button class="asset-link-modal__confirm" id="alm-confirm">APPLY</button>',
        '<button class="asset-link-modal__cancel" id="alm-cancel">CANCEL</button>',
      '</div>',
    '</div>',
  ].join('');
  document.body.appendChild(linkModal);
  document.getElementById('alm-cancel').addEventListener('click', function() {
    linkModal.classList.remove('open');
  });
  linkModal.addEventListener('click', function(e) {
    if (e.target === linkModal) linkModal.classList.remove('open');
  });

  /* ── Storage helpers ─────────────────────────────────── */
  var IMAGE_STORE_PREFIX = 'portfolio__img__';

  function storeImage(key, dataUrl) {
    try { localStorage.setItem(IMAGE_STORE_PREFIX + key, dataUrl); return true; }
    catch(e) {
      if (e.name === 'QuotaExceededError') {
        alert('Image too large to store in browser (> ~4MB). Please resize the image first, or add it directly to assets/images/ in your GitHub repo.');
      }
      return false;
    }
  }

  function loadStoredImages() {
    // On page load, apply any stored images to their placeholders
    document.querySelectorAll('[data-img-key]').forEach(function(placeholder) {
      var key = placeholder.getAttribute('data-img-key');
      var stored = localStorage.getItem(IMAGE_STORE_PREFIX + key);
      if (stored) applyStoredImage(placeholder, stored);
    });
  }

  function applyStoredImage(container, dataUrl) {
    // Hide placeholder content, show the image
    var existing = container.querySelector('.placeholder-uploaded');
    if (existing) { existing.src = dataUrl; return; }
    var img = document.createElement('img');
    img.className = 'placeholder-uploaded';
    img.src = dataUrl;
    img.alt = 'Uploaded image';
    // Insert before the upload trigger so trigger stays on top
    var trigger = container.querySelector('.upload-trigger');
    if (trigger) {
      container.insertBefore(img, trigger);
    } else {
      container.appendChild(img);
    }
    // Hide the placeholder icon/label
    var icon  = container.querySelector('.card-media__placeholder-icon, .about-hero__placeholder-icon');
    var label = container.querySelector('.card-media__placeholder-label, .about-hero__placeholder-label');
    if (icon)  icon.style.display  = 'none';
    if (label) label.style.display = 'none';
  }

  /* ── Show the guide panel ────────────────────────────── */
  function showAssetGuide(type) {
    var title = document.getElementById('asset-guide-title');
    var steps = document.getElementById('asset-guide-steps');

    if (type === 'pdf') {
      title.textContent = 'Adding a PDF or Word document';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text">Open your GitHub repo and navigate to <code>assets/docs/</code></div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">Drag and drop your PDF or DOCX file into that folder and commit.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text">The file path will be <code>assets/docs/your-file.pdf</code> — this matches what's already set in <code>data-doc-src</code> on the project card.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">4</div>',
        '<div class="asset-guide__step-text">If the filename is different, unlock → enable editing → click the button text to update the <code>data-doc-src</code> value.</div></div>',
      ].join('');
    } else if (type === 'video') {
      title.textContent = 'Adding a video';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text"><strong>YouTube (recommended):</strong> Upload to YouTube, copy the video ID from the URL (the part after <code>v=</code>).</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">In the project or media card, set <code>data-media-src</code> to <code>https://www.youtube.com/embed/YOUR_ID</code>.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text"><strong>Local video:</strong> Drop the file into <code>assets/videos/</code> in your GitHub repo and set <code>data-media-src</code> to <code>assets/videos/your-file.mp4</code>.</div></div>',
      ].join('');
    } else {
      title.textContent = 'Replacing a thumbnail image';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text">Click the upload zone — your OS file explorer will open.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">Select any image file (JPG, PNG, WebP). Images under 2MB are stored directly in the browser.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text">To make the change permanent for all visitors, also copy the file to <code>assets/images/</code> in your GitHub repo and commit.</div></div>',
      ].join('');
    }
    assetGuide.classList.add('open');
  }

  /* ── Inject upload triggers on all placeholders ──────── */
  function injectUploadTriggers() {
    // Image placeholders — media cards, about photo, project cards
    var imagePlaceholders = [
      { selector: '.card-media__placeholder',      type: 'image', keyFn: function(el) {
          var card = el.closest('[data-edit-id]') || el.closest('.project-card') || el.closest('.media-card');
          return card ? (card.id || card.getAttribute('data-new-id') || card.className.split(' ')[1] || 'img-' + Date.now()) : 'img-' + Date.now();
      }},
      { selector: '.media-card__placeholder',      type: 'image', keyFn: function(el) {
          var card = el.closest('.media-card');
          return card ? (card.getAttribute('data-new-id') || card.getAttribute('data-media-title') || 'media-' + Date.now()).replace(/\s+/g, '-') : 'media-' + Date.now();
      }},
      { selector: '.about-hero__placeholder',      type: 'image', keyFn: function() { return 'about-photo'; }},
    ];

    imagePlaceholders.forEach(function(spec) {
      document.querySelectorAll(spec.selector).forEach(function(placeholder) {
        if (placeholder.querySelector('.upload-trigger')) return; // already wired

        var key = spec.keyFn(placeholder);
        placeholder.setAttribute('data-img-key', key);
        placeholder.style.position = 'relative';

        var trigger = document.createElement('div');
        trigger.className = 'upload-trigger';
        trigger.setAttribute('title', 'Click to upload image');
        trigger.innerHTML = [
          '<div class="upload-trigger__icon">📁</div>',
          '<div class="upload-trigger__label">CLICK TO UPLOAD<br>IMAGE</div>',
        ].join('');

        // Hidden file input
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
        fileInput.style.display = 'none';
        placeholder.appendChild(fileInput);
        placeholder.appendChild(trigger);

        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          if (!document.body.classList.contains('owner-unlocked')) return;
          fileInput.click();
        });

        fileInput.addEventListener('change', function() {
          var file = fileInput.files[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) {
            alert('Image is ' + (file.size / 1024 / 1024).toFixed(1) + 'MB. Please use an image under 4MB for browser storage.

Alternatively, add the image to assets/images/ in your GitHub repo.');
            return;
          }
          var reader = new FileReader();
          reader.onload = function(ev) {
            var dataUrl = ev.target.result;
            var ok = storeImage(key, dataUrl);
            if (ok) {
              applyStoredImage(placeholder, dataUrl);
              trigger.querySelector('.upload-trigger__label').textContent = '✓ UPLOADED';
              setTimeout(function() {
                trigger.querySelector('.upload-trigger__label').innerHTML = 'CLICK TO CHANGE<br>IMAGE';
              }, 2000);
            }
          };
          reader.readAsDataURL(file);
          fileInput.value = ''; // reset so same file can be re-selected
        });

        // Also load any previously stored image
        var stored = localStorage.getItem(IMAGE_STORE_PREFIX + key);
        if (stored) applyStoredImage(placeholder, stored);
      });
    });

    // PDF/doc placeholders — show guide
    document.querySelectorAll('.card-media__placeholder-icon').forEach(function(icon) {
      var text = icon.textContent.trim();
      if (text === '📐' || text === '📄' || text === '📚' || text === '🔥') {
        var placeholder = icon.closest('.card-media');
        if (!placeholder || placeholder.querySelector('.upload-trigger')) return;
        var trigger = document.createElement('div');
        trigger.className = 'upload-trigger';
        trigger.setAttribute('title', 'How to add this document');
        trigger.innerHTML = [
          '<div class="upload-trigger__icon">📋</div>',
          '<div class="upload-trigger__label">HOW TO ADD<br>THIS FILE</div>',
        ].join('');
        placeholder.style.position = 'relative';
        placeholder.appendChild(trigger);
        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          showAssetGuide('pdf');
        });
      }
    });

    // Video placeholders — show guide
    document.querySelectorAll('.card-media__play').forEach(function(playBtn) {
      var placeholder = playBtn.closest('.card-media');
      if (!placeholder) return;
      var hasImage = placeholder.querySelector('img');
      var hasTrigger = placeholder.querySelector('.upload-trigger[data-video-guide]');
      if (hasImage || hasTrigger) return;
      var triggerIcon = placeholder.querySelector('.card-media__placeholder-icon');
      if (!triggerIcon || triggerIcon.textContent.trim() !== '🎬') return;

      var trigger = document.createElement('div');
      trigger.className = 'upload-trigger';
      trigger.setAttribute('data-video-guide', '1');
      trigger.setAttribute('title', 'How to add a video');
      trigger.innerHTML = [
        '<div class="upload-trigger__icon">🎬</div>',
        '<div class="upload-trigger__label">HOW TO ADD<br>VIDEO</div>',
      ].join('');
      placeholder.style.position = 'relative';
      placeholder.appendChild(trigger);
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        showAssetGuide('video');
      });
    });
  }

  /* ── Run on unlock and on load ───────────────────────── */
  var _origUnlock = unlock;
  function unlock() {
    _origUnlock();
    setTimeout(injectUploadTriggers, 100);
  }

  // Also load stored images immediately on page load (for visitors to see)
  setTimeout(loadStoredImages, 50);


})();
