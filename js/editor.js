/* ============================================================
   editor.js — v5
   Owner Lock · Inline Edit · Format Bar (synced) · Add Cards ·
   Universal Delete · Settings Panel · Slideable Skill Bars ·
   Shared Format Engine (page bar + article reader bar unified)
   Auto data-edit-id coverage for missing static fields
============================================================ */

/* ════════════════════════════════════════════════════════════
   SHARED FORMAT ENGINE  — Word-style toolbar behaviour
   ────────────────────────────────────────────────────────────
   Key design:
   · saveRange()  — always called on mousedown BEFORE the click
     moves focus away from the contenteditable. This is the
     single most important trick. All controls call it first.
   · applyFontSize() — uses execCommand('fontSize', 7) sentinel
     then replaces the injected <font> elements with
     <span style="font-size:Xpx">.  Works on multi-node
     selections, partial words, and across element boundaries.
   · syncControls() — reads the COMPUTED style of the anchor
     node, not the attribute.  This means the displayed size
     always matches what the text actually looks like, even
     when inherited from a parent.
   · currentSize variable — updated on every selectionchange
     so stepper buttons always start from the correct value.
════════════════════════════════════════════════════════════ */
window.FormatEngine = (function () {

  /* ── Read the real computed style of the current selection ── */
  function getSelectionStyle() {
    var result = {
      fontSize: null, fontFamily: '', bold: false,
      italic: false, underline: false, strikeThrough: false
    };
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return result;
    var node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    if (!node || node.nodeType !== 1) return result;
    try {
      var cs = window.getComputedStyle(node);
      var px = parseFloat(cs.fontSize);
      /* Round to nearest integer — avoids 15.9999 or 16.0001 noise */
      if (!isNaN(px) && px > 0) result.fontSize = Math.round(px);
      result.fontFamily    = cs.fontFamily || '';
      result.bold          = parseInt(cs.fontWeight) >= 600 ||
                             document.queryCommandState('bold');
      result.italic        = document.queryCommandState('italic');
      result.underline     = document.queryCommandState('underline');
      result.strikeThrough = document.queryCommandState('strikeThrough');
    } catch (e) {}
    return result;
  }

  /* ── Apply font size without losing the selection ────────────
     Strategy:
     1. Restore the saved range (selection may be gone if user
        clicked the toolbar).
     2. execCommand('fontSize', 7) — browser wraps selected text
        in <font size="7"> markers.
     3. Walk the DOM and replace every <font size="7"> with a
        <span style="font-size:Xpx">.
     4. Selection stays intact because we never removed it —
        we only replaced container elements around it.         */
  function applyFontSize(px, savedRange) {
    /* Restore selection first if a saved range was passed */
    if (savedRange) {
      var sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(savedRange); }
    }
    var currentSel = window.getSelection();
    if (!currentSel || !currentSel.rangeCount || currentSel.isCollapsed) return;

    /* Find the best search root — stay local to avoid touching
       font elements in other parts of the page */
    var searchRoot = document.body;
    try {
      var range    = currentSel.getRangeAt(0);
      var ancestor = range.commonAncestorContainer;
      while (ancestor && ancestor.nodeType !== 1) ancestor = ancestor.parentNode;
      if (ancestor) searchRoot = ancestor;
    } catch (e) {}

    var SENTINEL = 7;
    document.execCommand('fontSize', false, SENTINEL);

    /* Replace <font size="7"> with <span style="font-size:Xpx"> */
    var fonts = searchRoot.querySelectorAll('font[size="' + SENTINEL + '"]');
    /* querySelectorAll on searchRoot may miss if searchRoot itself
       is the font element (rare but possible) */
    if (fonts.length === 0 && searchRoot.tagName === 'FONT' &&
        searchRoot.getAttribute('size') == SENTINEL) {
      fonts = [searchRoot];
    }
    fonts.forEach(function (font) {
      var span = document.createElement('span');
      span.style.fontSize = px + 'px';
      while (font.firstChild) span.appendChild(font.firstChild);
      if (font.parentNode) font.parentNode.replaceChild(span, font);
    });
  }

  /* ── Sync toolbar controls to reflect the current selection ──
     Called on every selectionchange and after every command.
     Updates the size input, bold/italic/underline/strike states.
     Does NOT update the input if the user is actively typing
     in it (activeElement guard).                               */
  function syncControls(controls, currentSizeRef) {
    var style = getSelectionStyle();

    /* Size input — only update when the user isn't editing it */
    if (controls.sizeInput && style.fontSize !== null) {
      if (document.activeElement !== controls.sizeInput) {
        controls.sizeInput.value = style.fontSize;
      }
      /* Always update the shared size reference so steppers start correctly */
      if (currentSizeRef && style.fontSize !== null) {
        currentSizeRef.value = style.fontSize;
      }
    }

    function setActive(btn, state) {
      if (btn) btn.classList.toggle('active', !!state);
    }
    setActive(controls.boldBtn,       style.bold);
    setActive(controls.italicBtn,     style.italic);
    setActive(controls.underlineBtn,  style.underline);
    setActive(controls.strikeBtn,     style.strikeThrough);

    return style;
  }

  return {
    getSelectionStyle : getSelectionStyle,
    applyFontSize     : applyFontSize,
    syncControls      : syncControls
  };
}());


(function initEditor() {

  /* ── CONFIG ─────────────────────────────────────────────── */
  var OWNER_PASSPHRASE = localStorage.getItem('portfolio__passphrase') || 'blueprint2025';
  var SESSION_KEY      = 'portfolio__owner__unlocked';
  var SETTINGS_KEY     = 'portfolio__settings';

  /* ── XSS SANITISATION ────────────────────────────────────────
     All Firebase → innerHTML writes go through this wrapper.
     DOMPurify is the industry-standard sanitiser for HTML content.
     ALLOWED_TAGS: the full set used by the format bar (bold, italic,
     underline, strikethrough, links, spans with inline styles, lists,
     headings, blockquotes, superscript, subscript).
     We deliberately exclude <script>, <iframe>, <object>, <embed>,
     event handlers (onclick, onerror…), and javascript: URIs.
  ──────────────────────────────────────────────────────────── */
  var _purifyConfig = {
    ALLOWED_TAGS: [
      'b','strong','i','em','u','s','strike','del',
      'sup','sub','mark','br','p','span',
      'h1','h2','h3','h4','h5','h6',
      'ul','ol','li','blockquote','a'
    ],
    ALLOWED_ATTR: ['style','href','target','rel','class'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    FORCE_BODY: false
  };

  function sanitize(html) {
    if (typeof window.DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(html, _purifyConfig);
    }
    /* DOMPurify not loaded (offline / CDN blocked) — return as-is.
       In practice this path is only hit in local dev without internet. */
    return html;
  }


  /* ══════════════════════════════════════════════════════════
     PART 0 — SETTINGS PANEL
  ══════════════════════════════════════════════════════════ */

  var settingsBtn = document.createElement('button');
  settingsBtn.className = 'settings-btn';
  settingsBtn.setAttribute('aria-label', 'Page settings');
  settingsBtn.setAttribute('title', 'Page settings');
  settingsBtn.innerHTML = '⚙';
  document.body.appendChild(settingsBtn);

  var settingsPanel = document.createElement('div');
  settingsPanel.className = 'settings-panel';
  settingsPanel.setAttribute('role', 'dialog');
  settingsPanel.setAttribute('aria-label', 'Page settings');
  settingsPanel.innerHTML = [
    '<div class="settings-panel__title">// PAGE SETTINGS</div>',
    '<div class="settings-group">',
    '  <span class="settings-group__label">CONTRAST</span>',
    '  <div class="contrast-btns">',
    '    <button class="contrast-btn" data-contrast="light" title="Light">☀ LIGHT</button>',
    '    <button class="contrast-btn" data-contrast="dark"  title="Dark">🌙 DARK</button>',
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

  var translations = {
    en: {
      'nav.home':'home','nav.about':'about','nav.projects':'projects','nav.skills':'skills',
      'nav.articles':'articles','nav.media':'media','nav.contact':'contact',
      'hero.label':'// electrical engineer — class of 2025',
      'hero.subtitle':'BSc Electrical & Electronics Engineering · JKUAT · Open to internship',
      'hero.btn1':'VIEW PROJECTS','hero.btn2':'DOWNLOAD CV',
      'footer.status':'OPEN TO OPPORTUNITIES',
      'about.label':'// about','about.btn1':'DOWNLOAD CV','about.btn2':'GET IN TOUCH',
      'settings.contrast':'CONTRAST','settings.fontsize':'FONT SIZE',
      'settings.motion':'REDUCE ANIMATIONS','settings.language':'LANGUAGE',
    },
    sw: {
      'nav.home':'nyumbani','nav.about':'kuhusu','nav.projects':'miradi','nav.skills':'ujuzi',
      'nav.articles':'makala','nav.media':'midia','nav.contact':'wasiliana',
      'hero.label':'// mhandisi wa umeme — darasa la 2025',
      'hero.subtitle':'BSc Uhandisi wa Umeme na Elektroniki · JKUAT · Natafuta internship',
      'hero.btn1':'TAZAMA MIRADI','hero.btn2':'PAKUA CV',
      'footer.status':'WAZI KWA FURSA',
      'about.label':'// kuhusu','about.btn1':'PAKUA CV','about.btn2':'WASILIANA',
      'settings.contrast':'MWANGA','settings.fontsize':'UKUBWA WA FONTI',
      'settings.motion':'PUNGUZA MWENDO','settings.language':'LUGHA',
    }
  };

  var savedSettings = {};
  try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch(e) {}

  function applyContrast(val) {
    document.body.classList.remove('contrast-light','contrast-dark');
    document.body.classList.add('contrast-' + val);
    document.querySelectorAll('.contrast-btn:not(.lang-btn)').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-contrast') === val);
    });
    savedSettings.contrast = val; saveSettings();
  }
  function applyFontSize(val) {
    document.body.classList.remove('font-small','font-medium','font-large');
    document.body.classList.add('font-' + val);
    document.querySelectorAll('.fontsize-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-size') === val);
    });
    savedSettings.fontSize = val; saveSettings();
  }
  function applyLanguage(lang) {
    var t = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('.lang-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    savedSettings.language = lang; saveSettings();
  }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings)); }

  applyContrast(savedSettings.contrast || 'light');
  applyFontSize(savedSettings.fontSize  || 'medium');

  var motionToggle = document.getElementById('toggle-motion');
  if (savedSettings.reduceMotion && motionToggle) {
    motionToggle.checked = true;
    document.body.classList.add('reduce-motion');
  }
  setTimeout(function() { applyLanguage(savedSettings.language || 'en'); }, 100);

  settingsPanel.querySelectorAll('.contrast-btn:not(.lang-btn)').forEach(function(btn) {
    btn.addEventListener('click', function() { applyContrast(btn.getAttribute('data-contrast')); });
  });
  settingsPanel.querySelectorAll('.fontsize-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { applyFontSize(btn.getAttribute('data-size')); });
  });
  if (motionToggle) {
    motionToggle.addEventListener('change', function() {
      document.body.classList.toggle('reduce-motion', motionToggle.checked);
      savedSettings.reduceMotion = motionToggle.checked; saveSettings();
    });
  }
  settingsPanel.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { applyLanguage(btn.getAttribute('data-lang')); });
  });

  var settingsOpen = false;
  settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation(); settingsOpen = !settingsOpen;
    settingsPanel.classList.toggle('open', settingsOpen);
  });
  document.addEventListener('click', function(e) {
    if (settingsOpen && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      settingsOpen = false; settingsPanel.classList.remove('open');
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
  function closeLockOverlay() { if (overlay) overlay.classList.remove('visible'); }
  function tryUnlock() {
    var entered = lockInput.value;
    /* Also support passphrase set via localStorage key (SECURITY.md workflow) */
    var validPhrase = localStorage.getItem('portfolio__passphrase') || OWNER_PASSPHRASE;
    if (entered === validPhrase) {
      closeLockOverlay();
      setTimeout(unlock, 80);
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
     PART 3 — SAVE / LOAD / RESET  (Firebase-first, localStorage fallback)
  ══════════════════════════════════════════════════════════ */

  var pageName  = window.location.pathname.split('/').pop().replace('.html','') || 'index';
  var CACHE_KEY = 'portfolio__cache__' + pageName;   /* bulk-edit cache for flash-free loads */
  function storageKey(id) { return 'portfolio__edit__' + pageName + '__' + id; }

  function saveChanges() {
    /* Dynamic cards → localStorage (no Firebase slot, intentional) */
    var dynamic = [];
    document.querySelectorAll('.new-card').forEach(function(c) { dynamic.push(c.outerHTML); });
    localStorage.setItem(storageKey('__dynamic__'), JSON.stringify(dynamic));

    /* Text edits → Firebase ALWAYS (falls back to localStorage only if Firebase unavailable) */
    var editsMap = {};
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) editsMap[id] = el.innerHTML;
    });

    var hasFirebase = window.PF && typeof PF.saveAllEdits === 'function' && PF.isOwner();

    if (hasFirebase) {
      PF.saveAllEdits(editsMap)
        .then(function() {
          /* Refresh the bulk cache so next cold-start load is also flash-free */
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(editsMap)); } catch(e) {}
          btnSave.textContent = 'SAVED ✓';
          btnSave.style.background = '#4ade80';
          setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 1800);
        })
        .catch(function(err) {
          console.warn('[editor] Firebase save failed, falling back to localStorage:', err.message);
          Object.keys(editsMap).forEach(function(id) {
            localStorage.setItem(storageKey(id), editsMap[id]);
          });
          btnSave.textContent = 'SAVED (local) ✓';
          btnSave.style.background = '#f59e0b';
          setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 2200);
        });
    } else if (window.PF && typeof PF.saveAllEdits === 'function') {
      /* Firebase loaded but not yet signed in — prompt sign-in then retry */
      PF.ensureOwnerSignIn()
        .then(function() { return PF.saveAllEdits(editsMap); })
        .then(function() {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(editsMap)); } catch(e) {}
          btnSave.textContent = 'SAVED ✓';
          btnSave.style.background = '#4ade80';
          setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 1800);
        })
        .catch(function(err) {
          console.warn('[editor] Firebase sign-in / save failed:', err.message);
          Object.keys(editsMap).forEach(function(id) {
            localStorage.setItem(storageKey(id), editsMap[id]);
          });
          btnSave.textContent = 'SAVED (local) ✓';
          btnSave.style.background = '#f59e0b';
          setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 2200);
        });
    } else {
      /* Firebase not loaded at all */
      Object.keys(editsMap).forEach(function(id) {
        localStorage.setItem(storageKey(id), editsMap[id]);
      });
      btnSave.textContent = 'SAVED ✓';
      btnSave.style.background = '#4ade80';
      setTimeout(function() { btnSave.textContent = 'SAVE CHANGES'; btnSave.style.background = ''; }, 1800);
    }
  }

  function loadSavedChanges() {
    /* ── SHARED: restore dynamic cards from localStorage ── */
    function restoreDynamicCards() {
      try {
        var dynJSON = localStorage.getItem(storageKey('__dynamic__'));
        if (!dynJSON) return;
        var dynCards = JSON.parse(dynJSON);
        if (!Array.isArray(dynCards) || !dynCards.length) return;

        dynCards.forEach(function(html) {
          var tmp = document.createElement('div');
          tmp.innerHTML = html;
          var card = tmp.firstElementChild;
          if (!card) return;
          var anchor = null;
          if (card.classList.contains('exp-card') && !card.classList.contains('exp-card--add')) {
            anchor = document.querySelector('.exp-card--add');
            if (!anchor) anchor = document.querySelector('.exp-grid--bottom .exp-card--add');
          } else if (card.classList.contains('nav-card')) {
            anchor = document.querySelector('.card--add');
          } else if (card.classList.contains('media-card')) {
            anchor = document.getElementById('btn-add-media');
          } else if (card.classList.contains('skill-card')) {
            anchor = document.querySelector('.skill-add-card');
          } else if (card.classList.contains('cert-card')) {
            anchor = document.querySelector('.cert-add-card');
          } else if (card.classList.contains('project-card')) {
            anchor = document.querySelector('.project-add-card');
          }
          if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
        });

        setTimeout(function() {
          document.dispatchEvent(new CustomEvent('dynamicCardsRestored'));
          wireAddCards();
          if (document.body.classList.contains('owner-unlocked')) {
            injectAllDeleteBtns();
            /* Note: upload zone wiring for newly-restored cards is handled
               by injectUploadZones() in initUploadSystem which fires on
               dynamicCardsRestored dispatch above — no call needed here */
          }
        }, 80);
      } catch(e) {}
    }

    /* ── HELPER: apply an edits map to all data-edit-id elements ── */
    function applyEditsToDOM(edits) {
      getEditables().forEach(function(el) {
        var id = el.getAttribute('data-edit-id');
        if (id && edits[id] !== undefined && edits[id] !== null) {
          /* Only touch DOM if value actually changed — avoids caret disruption */
          if (el.innerHTML !== edits[id]) el.innerHTML = sanitize(edits[id]);
        }
      });
    }

    /* ══════════════════════════════════════════════════════════════
       PHASE 1 — INSTANT (synchronous, zero flash)
       Apply the localStorage bulk-edit cache immediately so visitors
       never see the original hardcoded content.  Firebase will
       confirm / override in Phase 2 with no visible jump.
    ══════════════════════════════════════════════════════════════ */
    var cachedEdits = {};
    try { cachedEdits = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e) {}

    applyEditsToDOM(cachedEdits);

    /* Legacy: individual localStorage keys for any field not in bulk cache */
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id && (cachedEdits[id] === undefined || cachedEdits[id] === null)) {
        var s = localStorage.getItem(storageKey(id));
        if (s !== null && el.innerHTML !== s) el.innerHTML = sanitize(s);
      }
    });

    /* ══════════════════════════════════════════════════════════════
       PHASE 2 — REAL-TIME FIREBASE (async, overrides Phase 1)
       • watchEdits fires first from the in-memory Firebase cache
         (fast after the first page load in a session), then again
         from the network whenever data changes.
       • Each response also refreshes the localStorage bulk cache
         so the next page load is instant even on a cold start.
       • Skip DOM updates while the owner is actively editing to
         avoid overwriting in-progress changes.
    ══════════════════════════════════════════════════════════════ */
    var dynamicCardsRestored = false;

    function onFirebaseEdits(edits) {
      /* Refresh the bulk cache — next load will be instant */
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(edits)); } catch(e) {}

      /* Apply to DOM only when not actively editing */
      if (!editMode) {
        applyEditsToDOM(edits);
      }

      /* Restore dynamic cards only once (first Firebase response) */
      if (!dynamicCardsRestored) {
        dynamicCardsRestored = true;
        restoreDynamicCards();
      }
    }

    if (window.PF) {
      if (typeof PF.watchEdits === 'function') {
        /* Preferred: real-time subscription */
        PF.watchEdits(onFirebaseEdits);
      } else if (typeof PF.loadEdits === 'function') {
        /* Fallback: one-time read */
        PF.loadEdits(onFirebaseEdits);
      } else {
        restoreDynamicCards();
      }
    } else {
      restoreDynamicCards();
    }
  }

  btnSave.addEventListener('click', saveChanges);
  btnReset.addEventListener('click', function() {
    if (!confirm('Reset all edits on this page?')) return;
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.removeItem(storageKey(id));
    });
    localStorage.removeItem(storageKey('__dynamic__'));
    localStorage.removeItem(CACHE_KEY); /* clear bulk cache so next load shows defaults */
    if (window.PF && typeof PF.saveAllEdits === 'function' && PF.isOwner()) {
      var nullMap = {};
      getEditables().forEach(function(el) {
        var id = el.getAttribute('data-edit-id');
        if (id) nullMap[id] = null;
      });
      PF.saveAllEdits(nullMap).catch(function(e) {
        console.warn('[editor] Firebase reset failed:', e.message);
      });
    }
    window.location.reload();
  });
  window.addEventListener('beforeunload', function() { if (editMode) saveChanges(); });


  /* ══════════════════════════════════════════════════════════
     PART 3b — AUTO data-edit-id COVERAGE
     Injects data-edit-id attributes on known static fields
     that were missing them in the HTML (index.html stats,
     nav cards, footer; other pages as needed).
     Only tags elements that have NO data-edit-id yet.
  ══════════════════════════════════════════════════════════ */
  (function autoTagMissingEditIds() {

    /* index.html — stats strip numbers and labels */
    var statsItems = document.querySelectorAll('.stats__item');
    statsItems.forEach(function(item, i) {
      var num = item.querySelector('.stats__number');
      var lbl = item.querySelector('.stats__label');
      if (num && !num.getAttribute('data-edit-id')) num.setAttribute('data-edit-id', 'idx-stat' + (i+1) + '-num');
      if (lbl && !lbl.getAttribute('data-edit-id')) lbl.setAttribute('data-edit-id', 'idx-stat' + (i+1) + '-lbl');
    });

    /* index.html — nav card grid inner text */
    document.querySelectorAll('.nav-grid .nav-card').forEach(function(card, i) {
      var tag   = card.querySelector('.nav-card__tag');
      var title = card.querySelector('.nav-card__title');
      var desc  = card.querySelector('.nav-card__desc');
      var pfx   = 'idx-nav' + (i+1);
      if (tag   && !tag.getAttribute('data-edit-id'))   tag.setAttribute('data-edit-id',   pfx + '-tag');
      if (title && !title.getAttribute('data-edit-id')) title.setAttribute('data-edit-id', pfx + '-title');
      if (desc  && !desc.getAttribute('data-edit-id'))  desc.setAttribute('data-edit-id',  pfx + '-desc');
    });

    /* footer — both text spans (shared across pages) */
    var footerLeft  = document.querySelector('.footer__left');
    var footerRight = document.querySelector('.footer__right');
    if (footerLeft  && !footerLeft.getAttribute('data-edit-id'))
      footerLeft.setAttribute('data-edit-id', 'footer-left');
    if (footerRight && !footerRight.getAttribute('data-edit-id'))
      footerRight.setAttribute('data-edit-id', 'footer-right');

    /* section labels (e.g. "// Navigate") */
    document.querySelectorAll('.section-label').forEach(function(el, i) {
      if (!el.getAttribute('data-edit-id'))
        el.setAttribute('data-edit-id', 'section-label-' + i);
    });

  })(); /* end autoTagMissingEditIds */

  /*
   * Run synchronously here — all data-edit-id elements (both hardcoded and
   * auto-tagged above) are in the DOM.  Phase 1 applies the localStorage
   * cache before the browser paints, eliminating the original→edited flash.
   */
  loadSavedChanges();


  /* ══════════════════════════════════════════════════════════
     PART 4 — UNIVERSAL DELETE
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
    if (el.querySelector('.card-delete-btn')) return;
    if (el.classList.contains('exp-card--add') || el.classList.contains('card--add') ||
        el.classList.contains('project-add-card') || el.classList.contains('skill-add-card') ||
        el.classList.contains('cert-add-card')) return;

    var btn = document.createElement('button');
    btn.className = 'card-delete-btn';
    btn.setAttribute('title', 'Delete this card');
    btn.setAttribute('aria-label', 'Delete card');
    btn.innerHTML = '✕';
    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.appendChild(btn);

    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
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
  ══════════════════════════════════════════════════════════ */

  function initSlideableBars() {
    document.querySelectorAll('.skill-bar').forEach(function(bar) {
      if (bar._sliderWired) return;
      bar._sliderWired = true;
      var track  = bar.querySelector('.skill-bar__track');
      var card   = bar.closest('.skill-card');
      var pctEl  = card ? card.querySelector('.skill-card__pct') : null;
      if (!track) return;
      var thumb = bar.querySelector('.skill-bar__thumb');
      if (!thumb) {
        thumb = document.createElement('div');
        thumb.className = 'skill-bar__thumb';
        track.appendChild(thumb);
      }
      var isDragging = false;
      function getPct(clientX) {
        var rect = bar.getBoundingClientRect();
        return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
      }
      function setLevel(pct) {
        track.style.width = pct + '%';
        track.setAttribute('data-level', pct);
        if (pctEl) pctEl.textContent = pct + '%';
      }
      function onMove(clientX) { if (isDragging) setLevel(getPct(clientX)); }
      bar.addEventListener('mousedown', function(e) {
        if (!document.body.classList.contains('owner-unlocked')) return;
        isDragging = true; thumb.classList.add('dragging'); setLevel(getPct(e.clientX)); e.preventDefault();
      });
      window.addEventListener('mousemove', function(e) { onMove(e.clientX); });
      window.addEventListener('mouseup', function() {
        if (isDragging) { isDragging = false; thumb.classList.remove('dragging'); }
      });
      bar.addEventListener('touchstart', function(e) {
        if (!document.body.classList.contains('owner-unlocked')) return;
        isDragging = true; thumb.classList.add('dragging');
        setLevel(getPct(e.touches[0].clientX)); e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', function(e) { if (isDragging) onMove(e.touches[0].clientX); });
      window.addEventListener('touchend', function() {
        if (isDragging) { isDragging = false; thumb.classList.remove('dragging'); }
      });
    });
  }


  /* ══════════════════════════════════════════════════════════
     PART 6 — ADD CARDS
  ══════════════════════════════════════════════════════════ */

  function makeExpCardHTML(uid) {
    return [
      '<div class="exp-card new-card fade-in visible" data-new-id="' + uid + '">',
      '  <div class="exp-card__org" contenteditable="false">ORGANISATION NAME</div>',
      '  <div class="exp-card__role" contenteditable="false">Job Title / Role</div>',
      '  <div class="exp-card__meta" contenteditable="false">Month Year – Month Year &nbsp;·&nbsp; Location</div>',
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
      '  <span class="nav-card__arrow" aria-hidden="true">↗</span>',
      '</a>'
    ].join('\n');
  }
  function uid() { return 'card-' + Date.now() + '-' + Math.floor(Math.random()*9999); }
  function wireNewCard(card) {
    injectDeleteBtn(card);
    if (editMode) card.querySelectorAll('[contenteditable]').forEach(function(el) {
      el.setAttribute('contenteditable','true');
    });
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
    var id = uid();
    var html = isExp ? makeExpCardHTML(id) : makeNavCardHTML(id);
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var newCard = tmp.firstElementChild;
    addCard.parentNode.insertBefore(newCard, addCard);
    wireNewCard(newCard);
    if (!editMode) enableEditMode();
    focusFirstField(newCard);
  }
  function wireAddCards() {
    document.querySelectorAll('.exp-card--add, .card--add').forEach(function(btn) {
      if (btn._wired) return; btn._wired = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!document.body.classList.contains('owner-unlocked')) return;
        handleAddCardClick(btn);
      });
    });
  }
  wireAddCards();


  /* ══════════════════════════════════════════════════════════
     PART 7 — FLOATING FORMAT TOOLBAR (page-level)
     NOW WITH LIVE SELECTION SYNC:
       · Font size input reflects actual computed px of selection
       · Bold/Italic/Underline/Strike buttons highlight when active
       · Size ▲▼ steps apply immediately without deselecting
  ══════════════════════════════════════════════════════════ */

  var FMTBAR_POS_KEY = 'editorFmtBarPos';
  var fmtBarPinned   = false;

  var formatBar = document.createElement('div');
  formatBar.className = 'format-bar';
  formatBar.setAttribute('role', 'toolbar');
  formatBar.setAttribute('aria-label', 'Text formatting');
  formatBar.innerHTML = [
    '<div class="format-bar__handle" title="Drag to reposition · Double-click to reset">⠿</div>',
    // ROW 1
    '<div class="format-bar__row">',
      '<select class="format-bar__heading-select" id="fmt-heading" title="Paragraph style">',
        '<option value="">¶ Normal</option>',
        '<option value="h1">Heading 1</option>',
        '<option value="h2">Heading 2</option>',
        '<option value="h3">Heading 3</option>',
        '<option value="blockquote">Quote</option>',
        '<option value="pre">Code block</option>',
      '</select>',
      '<div class="format-bar__divider"></div>',
      '<select class="format-bar__font-select" id="fmt-font" title="Font family">',
        '<option value="">Font</option>',
        '<option value="Syne,sans-serif">Syne</option>',
        '<option value="JetBrains Mono,monospace">Mono</option>',
        '<option value="Georgia,serif">Georgia</option>',
        '<option value="Arial,sans-serif">Arial</option>',
        '<option value="Times New Roman,serif">Times New Roman</option>',
        '<option value="Courier New,monospace">Courier New</option>',
      '</select>',
      '<div class="format-bar__divider"></div>',
      '<div class="format-bar__size-wrap" title="Font size — type or click arrows (selection stays active)">',
        '<input class="format-bar__size-input" type="number" id="fmt-size-input" min="8" max="96" value="16" />',
        '<div style="display:flex;flex-direction:column;">',
          '<button class="format-bar__size-step" id="fmt-size-up">▲</button>',
          '<button class="format-bar__size-step" id="fmt-size-down">▼</button>',
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
    // ROW 2
    '<div class="format-bar__row">',
      '<button class="format-bar__btn" id="fmt-btn-bold"          data-cmd="bold"          title="Bold (Ctrl+B)"><b>B</b></button>',
      '<button class="format-bar__btn" id="fmt-btn-italic"        data-cmd="italic"        title="Italic (Ctrl+I)"><i>I</i></button>',
      '<button class="format-bar__btn" id="fmt-btn-underline"     data-cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></button>',
      '<button class="format-bar__btn" id="fmt-btn-strike"        data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>',
      '<button class="format-bar__btn"                            data-cmd="superscript"   title="Superscript">x<sup>2</sup></button>',
      '<button class="format-bar__btn"                            data-cmd="subscript"     title="Subscript">x<sub>2</sub></button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="justifyLeft"   title="Align left">⇤ ≡</button>',
      '<button class="format-bar__btn" data-cmd="justifyCenter" title="Centre">≡</button>',
      '<button class="format-bar__btn" data-cmd="justifyRight"  title="Align right">≡ ⇥</button>',
      '<button class="format-bar__btn" data-cmd="justifyFull"   title="Justify">≡≡</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="insertUnorderedList" title="Bullet list">• ≡</button>',
      '<button class="format-bar__btn" data-cmd="insertOrderedList"   title="Numbered list">1.</button>',
      '<button class="format-bar__btn" data-cmd="indent"              title="Indent →">⇥</button>',
      '<button class="format-bar__btn" data-cmd="outdent"             title="Outdent ←">⇤</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn" data-cmd="insertHorizontalRule" title="Horizontal rule">—</button>',
      '<div class="format-bar__divider"></div>',
      '<button class="format-bar__btn format-bar__btn--clear" data-cmd="removeFormat" title="Clear formatting">✕ Clear</button>',
    '</div>',
  ].join('');
  document.body.appendChild(formatBar);

  /* ── Restore pinned position ── */
  (function() {
    var saved = localStorage.getItem(FMTBAR_POS_KEY);
    if (!saved) return;
    try {
      var pos = JSON.parse(saved);
      formatBar.style.left = Math.max(0, Math.min(pos.left, window.innerWidth  - 100)) + 'px';
      formatBar.style.top  = Math.max(0, Math.min(pos.top,  window.innerHeight - 40))  + 'px';
      fmtBarPinned = true;
      formatBar.classList.add('format-bar--pinned');
    } catch(e) { localStorage.removeItem(FMTBAR_POS_KEY); }
  }());

  /* ── Drag handle ── */
  var fmtHandle = formatBar.querySelector('.format-bar__handle');
  var fmtDrag   = { active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 };

  fmtHandle.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    fmtDrag.active   = true;
    fmtDrag.startX   = e.clientX;
    fmtDrag.startY   = e.clientY;
    fmtDrag.origLeft = parseInt(formatBar.style.left) || 0;
    fmtDrag.origTop  = parseInt(formatBar.style.top)  || 0;
    formatBar.classList.add('format-bar--dragging');
  });
  document.addEventListener('mousemove', function(e) {
    if (!fmtDrag.active) return;
    var newLeft = Math.max(0, Math.min(window.innerWidth  - formatBar.offsetWidth,  fmtDrag.origLeft + (e.clientX - fmtDrag.startX)));
    var newTop  = Math.max(0, Math.min(window.innerHeight - formatBar.offsetHeight, fmtDrag.origTop  + (e.clientY - fmtDrag.startY)));
    formatBar.style.left = newLeft + 'px';
    formatBar.style.top  = newTop  + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!fmtDrag.active) return;
    fmtDrag.active = false;
    formatBar.classList.remove('format-bar--dragging');
    fmtBarPinned = true;
    formatBar.classList.add('format-bar--pinned');
    localStorage.setItem(FMTBAR_POS_KEY, JSON.stringify({
      left: parseInt(formatBar.style.left),
      top:  parseInt(formatBar.style.top)
    }));
  });
  fmtHandle.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    fmtBarPinned = false;
    formatBar.classList.remove('format-bar--pinned');
    localStorage.removeItem(FMTBAR_POS_KEY);
    hideFormatBar();
  });

  /* ── Selection + format bar positioning ── */
  var savedRange = null;

  function saveRange() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function hideFormatBar() { formatBar.classList.remove('visible'); }
  function showFormatBar(x, y) {
    if (!fmtBarPinned) {
      var barW = Math.min(640, window.innerWidth - 16);
      var left = Math.min(x - barW / 2, window.innerWidth - barW - 8);
      if (left < 8) left = 8;
      var top  = Math.max(8, y - formatBar.offsetHeight - 8);
      formatBar.style.left     = left + 'px';
      formatBar.style.top      = top  + 'px';
      formatBar.style.minWidth = barW + 'px';
    }
    formatBar.classList.add('visible');
  }
  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
  }
  function execFmt(cmd, val) { restoreSelection(); document.execCommand(cmd, false, val || null); }

  /* ── Command buttons (Bold, Italic, etc.) ── */
  formatBar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      saveRange();
      execFmt(btn.getAttribute('data-cmd'));
      /* Re-sync active states after command */
      syncFmtBarControls();
    });
  });

  /* ── Heading / paragraph style ── */
  var fmtHeading = document.getElementById('fmt-heading');
  fmtHeading.addEventListener('mousedown', saveRange);
  fmtHeading.addEventListener('change', function() {
    var val = this.value;
    if (!val) { execFmt('formatBlock', '<p>'); this.value = ''; return; }
    execFmt('formatBlock', '<' + val + '>');
    this.value = '';
  });

  /* ── Font family ── */
  var fmtFont = document.getElementById('fmt-font');
  fmtFont.addEventListener('mousedown', saveRange);
  fmtFont.addEventListener('change', function() { execFmt('fontName', this.value); this.value = ''; });

  /* ── Font size: input + steppers — uses FormatEngine.applyFontSize to keep selection ── */
  var fmtSizeInput = document.getElementById('fmt-size-input');
  var fmtSizeUp    = document.getElementById('fmt-size-up');
  var fmtSizeDown  = document.getElementById('fmt-size-down');
  /* Use an object so FormatEngine.syncControls can update it by reference */
  var currentFontSizeRef = { value: 16 };

  /* mousedown fires BEFORE the input steals focus from the contenteditable.
     This is the correct moment to save the selection range.                 */
  fmtSizeInput.addEventListener('mousedown', function() { saveRange(); });

  fmtSizeInput.addEventListener('input', function() {
    /* Live preview as user types — only apply when value is valid */
    var px = parseInt(this.value);
    if (!isNaN(px) && px >= 8 && px <= 96) {
      currentFontSizeRef.value = px;
      /* Don't apply yet — wait for Enter or blur to commit */
    }
  });

  fmtSizeInput.addEventListener('change', function() {
    var px = Math.max(8, Math.min(96, parseInt(this.value) || currentFontSizeRef.value));
    this.value = px;
    currentFontSizeRef.value = px;
    FormatEngine.applyFontSize(px, savedRange);
  });

  fmtSizeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var px = Math.max(8, Math.min(96, parseInt(this.value) || currentFontSizeRef.value));
      this.value = px;
      currentFontSizeRef.value = px;
      FormatEngine.applyFontSize(px, savedRange);
      this.blur();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentFontSizeRef.value = Math.min(96, currentFontSizeRef.value + 1);
      this.value = currentFontSizeRef.value;
      FormatEngine.applyFontSize(currentFontSizeRef.value, savedRange);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentFontSizeRef.value = Math.max(8, currentFontSizeRef.value - 1);
      this.value = currentFontSizeRef.value;
      FormatEngine.applyFontSize(currentFontSizeRef.value, savedRange);
    }
  });

  fmtSizeUp.addEventListener('mousedown', function(e) {
    e.preventDefault();
    saveRange();
    currentFontSizeRef.value = Math.min(96, currentFontSizeRef.value + 1);
    fmtSizeInput.value = currentFontSizeRef.value;
    FormatEngine.applyFontSize(currentFontSizeRef.value, savedRange);
  });

  fmtSizeDown.addEventListener('mousedown', function(e) {
    e.preventDefault();
    saveRange();
    currentFontSizeRef.value = Math.max(8, currentFontSizeRef.value - 1);
    fmtSizeInput.value = currentFontSizeRef.value;
    FormatEngine.applyFontSize(currentFontSizeRef.value, savedRange);
  });

  /* ── Text colour ── */
  var fmtColor    = document.getElementById('fmt-color');
  var fmtColorBar = document.getElementById('fmt-color-bar');
  fmtColor.addEventListener('focus', saveRange);
  fmtColor.addEventListener('mousedown', saveRange);
  fmtColor.addEventListener('input', function() {
    if (fmtColorBar) fmtColorBar.style.background = this.value;
    restoreSelection();
    document.execCommand('foreColor', false, this.value);
  });

  /* ── Highlight ── */
  var fmtHL    = document.getElementById('fmt-highlight');
  var fmtHLBar = document.getElementById('fmt-hl-bar');
  fmtHL.addEventListener('focus', saveRange);
  fmtHL.addEventListener('mousedown', saveRange);
  fmtHL.addEventListener('input', function() {
    if (fmtHLBar) fmtHLBar.style.background = this.value;
    restoreSelection();
    document.execCommand('hiliteColor', false, this.value);
  });

  /* ── Controls reference for sync ── */
  var fmtBarControls = {
    sizeInput:    fmtSizeInput,
    boldBtn:      document.getElementById('fmt-btn-bold'),
    italicBtn:    document.getElementById('fmt-btn-italic'),
    underlineBtn: document.getElementById('fmt-btn-underline'),
    strikeBtn:    document.getElementById('fmt-btn-strike'),
  };

  function syncFmtBarControls() {
    /* Pass currentFontSizeRef so syncControls can update it when
       the selection moves to text with a different size.          */
    FormatEngine.syncControls(fmtBarControls, currentFontSizeRef);
  }

  /* ── selectionchange: show bar + sync controls ── */
  document.addEventListener('selectionchange', function() {
    if (!editMode) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setTimeout(function() {
        if (!formatBar.matches(':hover')) hideFormatBar();
      }, 120);
      return;
    }
    /* Check selection is inside a contenteditable */
    var node = sel.anchorNode;
    var inEdit = false;
    while (node) {
      if (node.getAttribute && (
        node.getAttribute('contenteditable') === 'true' ||
        node.getAttribute('data-edit-id'))) { inEdit = true; break; }
      node = node.parentNode;
    }
    if (!inEdit) return;

    savedRange = sel.getRangeAt(0).cloneRange();
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    showFormatBar(rect.left + rect.width / 2, rect.top);

    /* Sync toolbar state to reflect selected text */
    syncFmtBarControls();
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
    lockBtn.innerHTML = '<span class="lock-btn__icon">🔓</span><span class="lock-btn__text">LOCK</span>';
    injectAllDeleteBtns();
    initSlideableBars();
    wireAddCards();
    /* NOTE: injectUploadTriggers() intentionally NOT called here.
       initUploadSystem (below) owns all upload wiring and fires its
       own MutationObserver on the 'owner-unlocked' class add.
       Calling it here as well was the root cause of duplicate upload buttons. */
    document.dispatchEvent(new CustomEvent('ownerUnlocked'));
  }

  function lock() {
    document.body.classList.remove('owner-unlocked');
    sessionStorage.removeItem(SESSION_KEY);
    toolbar.style.display = 'none';
    disableEditMode();
    lockBtn.innerHTML = '<span class="lock-btn__icon">🔒</span><span class="lock-btn__text">OWNER</span>';
    if (window.PF && typeof PF.signOut === 'function') {
      PF.signOut().catch(function(e) { console.warn('[editor] Firebase sign-out error:', e.message); });
    }
    document.dispatchEvent(new CustomEvent('ownerLocked'));
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();

  /* ── GLOBAL EXPORTS ──────────────────────────────────────────────
     Expose key functions so page-level inline scripts (projects.html,
     media.html, etc.) can call them without being inside this IIFE.
  ──────────────────────────────────────────────────────────────── */
  window.enableEditMode  = enableEditMode;
  window.disableEditMode = disableEditMode;
  window.unlockOwner     = unlock;
  window.lockOwner       = lock;


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


  /* ══════════════════════════════════════════════════════════
     PART 10 — ASSET GUIDE PANEL only.
     Upload trigger wiring is owned exclusively by initUploadSystem
     below. This part only injects the guide panel UI that the
     upload zones reference via showAssetGuide().
  ══════════════════════════════════════════════════════════ */

  /* ── Keep legacy image storage helpers for backward-compat
     (loadStoredImages below reads keys written by old version) ── */
  var IMAGE_STORE_PREFIX = 'portfolio__img__';

  function storeImage(key, dataUrl) {
    try { localStorage.setItem(IMAGE_STORE_PREFIX + key, dataUrl); return true; }
    catch(e) {
      if (e.name === 'QuotaExceededError') {
        alert('Image too large to store in browser. Please resize first, or add directly to assets/images/ in your GitHub repo.');
      }
      return false;
    }
  }

  function applyStoredImage(container, dataUrl) {
    var existing = container.querySelector('.placeholder-uploaded');
    if (existing) { existing.src = dataUrl; return; }
    var img = document.createElement('img');
    img.className = 'placeholder-uploaded';
    img.src = dataUrl;
    img.alt = 'Uploaded image';
    var trigger = container.querySelector('.upload-trigger');
    if (trigger) container.insertBefore(img, trigger);
    else container.appendChild(img);
    var icon  = container.querySelector('.card-media__placeholder-icon, .about-hero__placeholder-icon');
    var label = container.querySelector('.card-media__placeholder-label, .about-hero__placeholder-label');
    if (icon)  icon.style.display  = 'none';
    if (label) label.style.display = 'none';
  }

  function loadStoredImages() {
    document.querySelectorAll('[data-img-key]').forEach(function(placeholder) {
      var key    = placeholder.getAttribute('data-img-key');
      var stored = localStorage.getItem(IMAGE_STORE_PREFIX + key);
      if (stored) applyStoredImage(placeholder, stored);
    });
  }

  function showAssetGuide(type) {
    var guide = document.getElementById('asset-guide');
    var title = document.getElementById('asset-guide-title');
    var steps = document.getElementById('asset-guide-steps');
    if (!guide || !title || !steps) return;
    if (type === 'pdf') {
      title.textContent = 'Adding a PDF or Word document';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text">Open your GitHub repo and navigate to <code>assets/docs/</code></div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">Drag and drop your PDF or DOCX file into that folder and commit.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text">The file path will be <code>assets/docs/your-file.pdf</code> — this matches <code>data-doc-src</code> on the project card.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">4</div>',
        '<div class="asset-guide__step-text">If the filename differs, unlock → enable editing → click the button text to update <code>data-doc-src</code>.</div></div>',
      ].join('');
    } else if (type === 'video') {
      title.textContent = 'Adding a video';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text"><strong>YouTube (recommended):</strong> Upload to YouTube, copy the video ID from the URL (after <code>v=</code>).</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">Set <code>data-media-src</code> to <code>https://www.youtube.com/embed/YOUR_ID</code>.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text"><strong>Local video:</strong> Drop into <code>assets/videos/</code> and set <code>data-media-src</code> to <code>assets/videos/your-file.mp4</code>.</div></div>',
      ].join('');
    } else {
      title.textContent = 'Replacing a thumbnail image';
      steps.innerHTML = [
        '<div class="asset-guide__step"><div class="asset-guide__step-num">1</div>',
        '<div class="asset-guide__step-text">Click the upload zone — your OS file explorer will open.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">2</div>',
        '<div class="asset-guide__step-text">Select any image file (JPG, PNG, WebP). Images under 2MB are stored in browser.</div></div>',
        '<div class="asset-guide__step"><div class="asset-guide__step-num">3</div>',
        '<div class="asset-guide__step-text">To make permanent for all visitors, copy the file to <code>assets/images/</code> and commit.</div></div>',
      ].join('');
    }
    guide.classList.add('open');
  }

  /* Inject asset guide panel (once) */
  if (!document.getElementById('asset-guide')) {
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
  }

  setTimeout(loadStoredImages, 50);

})(); /* end initEditor */


/* ═══════════════════════════════════════════════════════════
   FILE UPLOAD SYSTEM  (full version — Cloudinary-ready)
   Handles: image placeholders, doc buttons, video zones,
   social link editors. Toast notifications. localStorage
   storage for images. Shown only when owner-unlocked.
═══════════════════════════════════════════════════════════ */
(function initUploadSystem() {

  /* ── TOAST ── */
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
  function hideToast() { toast.classList.remove('visible'); clearTimeout(toastTimer); }

  /* ── FILE STORAGE ── */
  var UPLOAD_PREFIX  = 'portfolio__upload__';
  var SIZE_LIMIT_MB  = 2.5;

  function uploadKey(assetPath) { return UPLOAD_PREFIX + assetPath.replace(/\//g, '__'); }

  function loadStoredUploads() {
    document.querySelectorAll('[data-asset-path]').forEach(function(el) {
      var assetPath = el.getAttribute('data-asset-path');
      var assetType = el.getAttribute('data-asset-type') || 'image';
      var stored = null;
      try { stored = localStorage.getItem(uploadKey(assetPath)); } catch(e) {}
      if (stored) applyStoredFile(el, stored, assetType, assetPath);
    });


    document.querySelectorAll('.card-media__placeholder, .media-card__placeholder').forEach(function(ph) {
      if (ph._uploadWired) return;
      var card = ph.closest('.project-card, .media-card');
      if (!card) return;
      var titleEl = card.querySelector('[data-edit-id$="-title"], .card-title, .media-card__title');
      if (!titleEl) return;
      var slug = titleEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,30);
      var assetPath = 'assets/images/' + slug + '.jpg';
      var stored = null;
      try { stored = localStorage.getItem(uploadKey(assetPath)); } catch(e) {}
      if (stored) applyStoredFile(ph, stored, 'image', assetPath);
    });
  }

  function applyStoredFile(targetEl, dataUrl, assetType, assetPath) {
    if (assetType === 'image') {
      var container = targetEl.closest('.card-media, .about-hero__img-wrap, .media-card__thumb');
      if (!container) container = targetEl.parentElement;
      var placeholder = container.querySelector('.card-media__placeholder, .about-hero__placeholder, .media-card__placeholder');
      if (placeholder) placeholder.style.display = 'none';
      var img = container.querySelector('img[data-uploaded]');
      if (!img) {
        img = document.createElement('img');
        img.setAttribute('data-uploaded', '1');
        img.alt = assetPath.split('/').pop().replace(/\.[^.]+$/, '').replace(/-/g, ' ');
        container.insertBefore(img, container.firstChild);
      }
      img.src = dataUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      /* LOCAL ONLY badge — owner visibility only. Visitors see the image without the badge. */
      var badge = container.querySelector('.upload-local-badge');
      if (badge) badge.style.display = document.body.classList.contains('owner-unlocked') ? '' : 'none';
      container.setAttribute('data-has-upload', '1');
      var changeBtn = container.querySelector('.upload-change-btn');
      if (!changeBtn) {
        changeBtn = document.createElement('button');
        changeBtn.className = 'upload-change-btn';
        changeBtn.textContent = '✎ CHANGE PHOTO';
        /* Change button only for owners */
        changeBtn.style.display = document.body.classList.contains('owner-unlocked') ? '' : 'none';
        container.appendChild(changeBtn);
        changeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var zone = container.querySelector('.upload-zone');
          if (zone) zone.click();
        });
      }
    } else if (assetType === 'pdf' || assetType === 'docx') {
      var btn = document.querySelector('[data-doc-src="' + assetPath + '"]');
      if (btn) { btn.style.opacity = '1'; btn.style.borderColor = 'rgba(74,222,128,0.4)'; }
    }
  }

  /* ── FILE PICKER ── */
  function openFilePicker(accept, onFile) {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = accept; input.style.display = 'none';
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

  /* ── INJECT UPLOAD ZONES ── */
  function injectUploadZones() {
    /* Images */
    var imagePlaceholders = document.querySelectorAll(
      '.card-media__placeholder, .media-card__placeholder, .about-hero__placeholder'
    );
    imagePlaceholders.forEach(function(ph) {
      if (ph._uploadWired) return;
      /* Skip about.html profile photo — managed exclusively by about.html inline script */
      if (ph.id === 'profile-placeholder' || ph.closest('#profile-img-wrap')) return;
      ph._uploadWired = true;
      var container = ph.closest('[data-asset-path]');
      var assetPath, assetType;
      if (container) {
        assetPath = container.getAttribute('data-asset-path');
        assetType = container.getAttribute('data-asset-type') || 'image';
      } else {
        if (ph.classList.contains('about-hero__placeholder')) {
          assetPath = 'assets/images/rubui-mwangi.jpg'; assetType = 'image'; container = ph;
        } else {
          var card = ph.closest('.project-card, .media-card, .about-hero__img-wrap');
          if (card) {
            var titleEl = card.querySelector('[data-edit-id$="-title"], .card-title, .media-card__title');
            var slug = titleEl ? titleEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,30) : 'image-' + Date.now();
            assetPath = 'assets/images/' + slug + '.jpg'; assetType = 'image'; container = ph;
          }
        }
      }
      if (!assetPath) return;
      var zone = document.createElement('div');
      zone.className = 'upload-zone';
      zone.innerHTML = '<div class="upload-zone__icon">📁</div><div class="upload-zone__label">CLICK TO UPLOAD<br>IMAGE</div><div class="upload-zone__hint">JPG · PNG · WEBP · GIF</div>';
      ph.style.position = 'relative'; ph.appendChild(zone);
      var badge = document.createElement('div');
      badge.className = 'upload-local-badge'; badge.textContent = '⚡ LOCAL ONLY'; badge.style.display = 'none';
      var badgeTarget = ph.closest('.card-media, .media-card__thumb, .about-hero__img-wrap');
      if (badgeTarget) badgeTarget.appendChild(badge);
      var finalAssetPath = assetPath;
      var finalAssetType = assetType;
      zone.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;
        openFilePicker('image/jpeg,image/png,image/webp,image/gif', function(file) {
          var sizeMB = file.size / (1024 * 1024);
          if (sizeMB > SIZE_LIMIT_MB) {
            showToast('⚠ File too large',
              '<span class="upload-toast__warn">This image is ' + sizeMB.toFixed(1) + 'MB. ' +
              'Keep under ' + SIZE_LIMIT_MB + 'MB for browser storage, or add directly to <code>' + finalAssetPath + '</code> and push to GitHub.</span>',
              8000); return;
          }
          readAsDataURL(file, function(dataUrl) {
            try { localStorage.setItem(uploadKey(finalAssetPath), dataUrl); }
            catch(e) {
              showToast('⚠ Storage full', '<span class="upload-toast__warn">Browser storage is full. Add the image directly to your assets/ folder.</span>', 6000);
              return;
            }
            applyStoredFile(ph, dataUrl, finalAssetType, finalAssetPath);
            var fname = file.name;
            var ext   = fname.split('.').pop().toLowerCase();
            var suggested = finalAssetPath.replace(/\.[^.]+$/, '.' + ext);
            showToast('✓ Image uploaded locally',
              '<div class="upload-toast__path">Save as: ' + suggested + '</div>' +
              '<div class="upload-toast__warn">⚡ Stored in your browser only.<br>' +
              'To make it permanent for all visitors:<br>' +
              '1. Save the file as <strong>' + fname + '</strong><br>' +
              '2. Copy into <strong>assets/images/</strong><br>' +
              '3. Commit and push to GitHub</div>', 10000);
          });
        });
      });
    });

    /* PDF / DOCX upload buttons
       ─────────────────────────────────────────────────────────────────────
       FIX (v6): Previous version used URL.createObjectURL() which produced
       a blob: URL that is:
         (a) session-only — revoked on tab close
         (b) sent to Google Docs viewer which CANNOT read blob: URLs
         (c) required re-wiring wireDocBtns via _docWired=false which
             caused the doc viewer to either double-fire or not fire at all

       New approach:
         1. Read the file as a base64 DataURL (like image uploads do)
         2. Store it in localStorage under uploadKey(assetPath)
         3. Update btn.setAttribute('data-doc-src', dataUrl) in-place
            without touching _docWired — the existing click listener on
            btn already reads the current data-doc-src attribute live
         4. In openDocViewer (projects.html), data: URLs are treated as
            local PDFs — the inline viewer handles them natively via an
            <iframe srcdoc> or object element, bypassing Google Docs
       ────────────────────────────────────────────────────────────────── */
    var DOC_SIZE_LIMIT_MB = 4; /* 4 MB base64 ≈ 5.3 MB encoded — safe for localStorage */
    document.querySelectorAll('[data-doc-src]').forEach(function(btn) {
      if (btn._uploadDocWired || !btn.classList.contains('card-btn--primary')) return;
      btn._uploadDocWired = true;
      var assetPath = btn.getAttribute('data-doc-src');
      /* Skip buttons that already point to a stored data URL or blob */
      if (/^data:|^blob:/.test(assetPath)) return;
      var assetType = btn.getAttribute('data-doc-type') || 'pdf';
      var uploadBtn = document.createElement('button');
      uploadBtn.className = 'card-btn owner-only';
      uploadBtn.title = 'Upload ' + assetType.toUpperCase() + ' file to replace placeholder';
      uploadBtn.innerHTML = '<span style="font-size:11px;">📂</span> UPLOAD ' + assetType.toUpperCase();
      /* Always hidden by default; shown only when owner-unlocked */
      uploadBtn.style.display = document.body.classList.contains('owner-unlocked') ? '' : 'none';
      if (btn.parentNode) btn.parentNode.insertBefore(uploadBtn, btn.nextSibling);

      uploadBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;
        var accept = assetType === 'pdf'
          ? 'application/pdf'
          : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        openFilePicker(accept, function(file) {
          var sizeMB = file.size / (1024 * 1024);
          if (sizeMB > DOC_SIZE_LIMIT_MB) {
            showToast('⚠ File too large',
              '<div class="upload-toast__warn">This file is ' + sizeMB.toFixed(1) + 'MB.<br>' +
              'Keep under ' + DOC_SIZE_LIMIT_MB + 'MB for browser storage.<br>' +
              'Larger files must be committed to <code>assets/docs/</code> in GitHub.</div>', 8000);
            return;
          }
          readAsDataURL(file, function(dataUrl) {
            /* Persist in localStorage — survives page refresh, no session limit */
            try { localStorage.setItem(uploadKey(assetPath), dataUrl); }
            catch(storageErr) {
              showToast('⚠ Storage full',
                '<div class="upload-toast__warn">Browser storage is full. ' +
                'Commit the file to <code>' + assetPath + '</code> in GitHub instead.</div>', 7000);
              return;
            }

            /* Update the READ/VIEW button's src attribute directly.
               The existing click listener reads data-doc-src live,
               so this takes effect immediately — no re-wiring needed. */
            btn.setAttribute('data-doc-src', dataUrl);
            btn.setAttribute('data-doc-type', assetType);

            /* Also update any paired download link */
            var downloadLink = btn.parentNode && btn.parentNode.querySelector('a[download]');
            if (downloadLink) downloadLink.href = dataUrl;

            /* Visual feedback: highlight the read button green */
            var prevBg = btn.style.background;
            btn.style.background = 'rgba(74,222,128,0.18)';
            btn.style.borderColor = 'rgba(74,222,128,0.6)';
            setTimeout(function() {
              btn.style.background = prevBg;
              btn.style.borderColor = '';
            }, 2500);

            showToast('✓ ' + assetType.toUpperCase() + ' ready',
              '<div class="upload-toast__path">File: ' + file.name + '</div>' +
              '<div class="upload-toast__warn">Stored in browser — persists across page refreshes.<br>' +
              'Click <strong>' + (btn.textContent.trim().split(' ')[0] || 'READ') + '</strong> to open the document viewer.<br><br>' +
              'To make it permanent for all visitors:<br>' +
              '1. Name the file: <strong>' + assetPath.split('/').pop() + '</strong><br>' +
              '2. Copy into <strong>' + assetPath.split('/').slice(0,-1).join('/') + '/</strong><br>' +
              '3. Commit and push to GitHub</div>', 14000);
          });
        });
      });

      /* Restore on page load: if a base64 version was stored from a previous upload,
         apply it immediately so the viewer button is ready without any upload action. */
      var storedDoc = null;
      try { storedDoc = localStorage.getItem(uploadKey(assetPath)); } catch(e) {}
      if (storedDoc && /^data:/.test(storedDoc)) {
        btn.setAttribute('data-doc-src', storedDoc);
        btn.style.borderColor = 'rgba(74,222,128,0.35)';
        btn.title = btn.title + ' (stored locally)';
      }
    });

    /* Video upload zones */
    document.querySelectorAll('[data-media-type="local"][data-media-src*="assets/"]').forEach(function(card) {
      if (card._uploadVideoWired) return;
      card._uploadVideoWired = true;
      var assetPath = card.getAttribute('data-media-src');
      var thumb = card.querySelector('.card-media__thumb, .media-card__thumb');
      if (!thumb) return;
      var zone = document.createElement('div');
      zone.className = 'upload-zone'; zone.style.zIndex = '6';
      zone.innerHTML = '<div class="upload-zone__icon">🎬</div><div class="upload-zone__label">UPLOAD VIDEO</div><div class="upload-zone__hint">MP4 · MOV · WEBM</div>';
      thumb.style.position = 'relative'; thumb.appendChild(zone);
      zone.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!document.body.classList.contains('owner-unlocked')) return;
        openFilePicker('video/mp4,video/webm,video/quicktime', function(file) {
          var objectUrl = URL.createObjectURL(file);
          card.setAttribute('data-media-src', objectUrl);
          card._wired = false;
          showToast('✓ Video loaded for this session',
            '<div class="upload-toast__path">File: ' + file.name + '</div>' +
            '<div class="upload-toast__warn">⚡ Session only. To make permanent:<br>' +
            '1. Name file: <strong>' + assetPath.split('/').pop() + '</strong><br>' +
            '2. Place in <strong>assets/videos/</strong><br>' +
            '3. Commit and push to GitHub</div>', 10000);
        });
      });
    });
  }

  /* ── SOCIAL LINK EDITOR ── */
  function injectLinkEditors() {
    document.querySelectorAll('.social-card').forEach(function(card) {
      if (card._linkEditWired) return;
      card._linkEditWired = true;
      card.style.position = 'relative';
      var editBtn = document.createElement('button');
      editBtn.className = 'link-edit-btn'; editBtn.title = 'Edit link URL'; editBtn.textContent = '🔗';
      card.appendChild(editBtn);

      /* Derive a stable key from the card's social class name          */
      var key       = 'portfolio__link__' + (card.className.match(/social-\w+/)||['social'])[0];
      var fbEditKey = 'social-link-' + (card.className.match(/social-\w+/)||['social'])[0];

      editBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var current = card.getAttribute('href') || '';
        var newUrl = window.prompt('Enter the full URL for this social link:\n(e.g. https://linkedin.com/in/yourname)', current);
        if (newUrl === null || !newUrl.trim()) return;

        var url = newUrl.trim();
        card.setAttribute('href', url);

        /* Always save to localStorage first (instant, always available) */
        try { localStorage.setItem(key, url); } catch(e) {}

        /* Save to Firebase so ALL devices see the updated link ───────── */
        if (window.PF && typeof PF.saveEdit === 'function') {
          var doSave = function() {
            PF.saveEdit(fbEditKey, url)
              .then(function() {
                showToast('✓ Link saved',
                  '<div class="upload-toast__path">' + url + '</div>' +
                  '<div class="upload-toast__warn">Saved to Firebase — visible on all devices.</div>',
                  5000);
              })
              .catch(function(err) {
                showToast('✓ Link updated (local only)',
                  '<div class="upload-toast__path">' + url + '</div>' +
                  '<div class="upload-toast__warn">Firebase save failed: ' + err.message + '<br>To make permanent, update href in contact.html and push to GitHub.</div>',
                  7000);
              });
          };
          if (PF.isOwner()) {
            doSave();
          } else {
            PF.ensureOwnerSignIn()
              .then(function() { doSave(); })
              .catch(function() {
                showToast('✓ Link updated (local only)',
                  '<div class="upload-toast__path">' + url + '</div>' +
                  '<div class="upload-toast__warn">Sign-in cancelled. To make permanent, update href in contact.html and push to GitHub.</div>',
                  7000);
              });
          }
        } else {
          showToast('✓ Link updated',
            '<div class="upload-toast__path">' + url + '</div>' +
            '<div class="upload-toast__warn">Saved to browser. To make permanent, update href in contact.html and push to GitHub.</div>',
            6000);
        }
      });

      /* On page load: restore from Firebase in real-time (watchEdits), fall back to localStorage.
         Using watchEdits means a link changed on any device appears instantly on all others.     */
      if (window.PF && typeof PF.watchEdits === 'function') {
        PF.watchEdits(function(edits) {
          var fbUrl = edits && edits[fbEditKey];
          if (fbUrl) {
            card.setAttribute('href', fbUrl);
            try { localStorage.setItem(key, fbUrl); } catch(e) {}   /* keep local in sync */
          } else {
            var lsUrl = null; try { lsUrl = localStorage.getItem(key); } catch(e) {}
            if (lsUrl) card.setAttribute('href', lsUrl);
          }
        });
      } else if (window.PF && typeof PF.loadEdits === 'function') {
        /* Fallback: one-time read if watchEdits unavailable */
        PF.loadEdits(function(edits) {
          var fbUrl = edits && edits[fbEditKey];
          if (fbUrl) {
            card.setAttribute('href', fbUrl);
            try { localStorage.setItem(key, fbUrl); } catch(e) {}
          } else {
            var lsUrl = null; try { lsUrl = localStorage.getItem(key); } catch(e) {}
            if (lsUrl) card.setAttribute('href', lsUrl);
          }
        });
      } else {
        /* Firebase not loaded — use localStorage */
        var lsUrl = null; try { lsUrl = localStorage.getItem(key); } catch(e) {}
        if (lsUrl) card.setAttribute('href', lsUrl);
      }
    });
  }

  /* ── WIRE ON UNLOCK / LOCK ── */
  var unlockObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        var isOwner = document.body.classList.contains('owner-unlocked');
        if (isOwner) {
          /* injectUploadZones guards with _uploadWired — safe to call multiple times */
          injectUploadZones();
          injectLinkEditors();
          /* Show upload-related owner-only elements */
          document.querySelectorAll('.card-btn[title^="Upload"], .upload-local-badge, .upload-change-btn').forEach(function(b) {
            b.style.display = '';
          });
        } else {
          /* Hide owner-only upload UI when locked */
          document.querySelectorAll('.upload-local-badge, .upload-change-btn').forEach(function(b) {
            b.style.display = 'none';
          });
        }
      }
    });
  });
  unlockObserver.observe(document.body, { attributes: true });

  if (document.body.classList.contains('owner-unlocked')) {
    injectUploadZones();
    injectLinkEditors();
  }
  loadStoredUploads();

  /* Also re-wire when dynamic cards are restored from localStorage */
  document.addEventListener('dynamicCardsRestored', function() {
    if (document.body.classList.contains('owner-unlocked')) {
      setTimeout(function() { injectUploadZones(); }, 60);
    }
  });

})(); /* end initUploadSystem */


/* ═══════════════════════════════════════════════════════════
   ARTICLES PAGE — READER FORMAT BAR SYNC PATCH
   Runs only on articles.html. Enhances the existing
   reader-format-bar to sync state + use FormatEngine
   for size stepping without deselect.
   This block is self-contained and safe to run on all pages
   (it checks for element existence before wiring).
═══════════════════════════════════════════════════════════ */
(function patchArticlesFormatBar() {

  /* ── Retry loop: attempt up to 10 times at 100ms intervals ──
     Replaces the brittle single 300ms setTimeout.  Stops as
     soon as the target elements exist (usually attempt 1–3). */
  var attempts = 0;
  var MAX_ATTEMPTS = 10;
  var INTERVAL_MS  = 100;

  function tryPatch() {
    attempts++;
    var rfbBar    = document.getElementById('reader-format-bar');
    var rfbSize   = document.getElementById('rfb-size-input');
    var rfbSizeUp = document.getElementById('rfb-size-up');
    var rfbSizeDn = document.getElementById('rfb-size-down');

    if (!rfbBar || !rfbSize) {
      if (attempts < MAX_ATTEMPTS) setTimeout(tryPatch, INTERVAL_MS);
      return; // elements not ready — retry
    }

    /* ── Find the bold/italic/underline/strike buttons by their data-cmd ── */
    var rfbBtns = {
      bold:         rfbBar.querySelector('[data-cmd="bold"]'),
      italic:       rfbBar.querySelector('[data-cmd="italic"]'),
      underline:    rfbBar.querySelector('[data-cmd="underline"]'),
      strikeThrough:rfbBar.querySelector('[data-cmd="strikeThrough"]'),
    };

    var rfbCurrentSize = 16;

    /* Re-wire the size steppers through FormatEngine (keeps selection alive) */
    if (rfbSizeUp) {
      /* Clone to remove old listener */
      var newUp = rfbSizeUp.cloneNode(true);
      rfbSizeUp.parentNode.replaceChild(newUp, rfbSizeUp);
      newUp.addEventListener('mousedown', function(e) {
        e.preventDefault();
        rfbCurrentSize = Math.min(96, rfbCurrentSize + 1);
        rfbSize.value  = rfbCurrentSize;
        FormatEngine.applyFontSize(rfbCurrentSize);
      });
    }
    if (rfbSizeDn) {
      var newDn = rfbSizeDn.cloneNode(true);
      rfbSizeDn.parentNode.replaceChild(newDn, rfbSizeDn);
      newDn.addEventListener('mousedown', function(e) {
        e.preventDefault();
        rfbCurrentSize = Math.max(8, rfbCurrentSize - 1);
        rfbSize.value  = rfbCurrentSize;
        FormatEngine.applyFontSize(rfbCurrentSize);
      });
    }

    /* Add arrow-key support to the size input */
    rfbSize.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        rfbCurrentSize = Math.min(96, rfbCurrentSize + 1);
        rfbSize.value  = rfbCurrentSize;
        FormatEngine.applyFontSize(rfbCurrentSize);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        rfbCurrentSize = Math.max(8, rfbCurrentSize - 1);
        rfbSize.value  = rfbCurrentSize;
        FormatEngine.applyFontSize(rfbCurrentSize);
      }
    });

    /* Sync the reader format bar controls to the current selection */
    var rfbControls = {
      sizeInput:    rfbSize,
      boldBtn:      rfbBtns.bold,
      italicBtn:    rfbBtns.italic,
      underlineBtn: rfbBtns.underline,
      strikeBtn:    rfbBtns.strikeThrough,
    };

    /* Hook into the reader body's selectionchange */
    var readerContent = document.getElementById('reader-content');
    if (readerContent) {
      document.addEventListener('selectionchange', function() {
        /* Only sync when inside the reader */
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var node = sel.anchorNode;
        var inReader = false;
        while (node) {
          if (node === readerContent) { inReader = true; break; }
          node = node.parentNode;
        }
        if (!inReader) return;
        FormatEngine.syncControls(rfbControls);
        var style = FormatEngine.getSelectionStyle();
        if (style.fontSize !== null) rfbCurrentSize = style.fontSize;
      });
    }

    /* Also sync after any command button press */
    rfbBar.querySelectorAll('[data-cmd]').forEach(function(btn) {
      btn.addEventListener('mouseup', function() {
        setTimeout(function() { FormatEngine.syncControls(rfbControls); }, 10);
      });
    });
  } /* end tryPatch */

  /* Start the retry loop on DOMContentLoaded or immediately if already loaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryPatch, 50); });
  } else {
    setTimeout(tryPatch, 50);
  }

})();

