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

  // Inject settings panel
  var settingsPanel = document.createElement('div');
  settingsPanel.className = 'settings-panel';
  settingsPanel.setAttribute('role', 'dialog');
  settingsPanel.setAttribute('aria-label', 'Page settings');
  settingsPanel.innerHTML = [
    '<div class="settings-panel__title">// PAGE SETTINGS</div>',

    '<div class="settings-group">',
    '  <span class="settings-group__label">CONTRAST</span>',
    '  <div class="contrast-btns">',
    '    <button class="contrast-btn" data-contrast="bright">BRIGHT</button>',
    '    <button class="contrast-btn" data-contrast="medium">MEDIUM</button>',
    '    <button class="contrast-btn" data-contrast="dark">DARK</button>',
    '  </div>',
    '</div>',

    '<div class="settings-group">',
    '  <span class="settings-group__label">FONT SIZE</span>',
    '  <div class="fontsize-btns">',
    '    <button class="fontsize-btn" data-size="small">A</button>',
    '    <button class="fontsize-btn" data-size="medium">A</button>',
    '    <button class="fontsize-btn" data-size="large">A</button>',
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
    '  <div class="settings-toggle">',
    '    <span class="settings-toggle__label">LANGUAGE</span>',
    '    <select id="lang-select" style="background:transparent;border:1px solid rgba(240,165,0,0.25);border-radius:6px;color:var(--amber);font-family:var(--font-mono);font-size:9px;padding:4px 8px;letter-spacing:0.1em;cursor:pointer;">',
    '      <option value="en">EN</option>',
    '      <option value="sw">SW</option>',
    '    </select>',
    '  </div>',
    '</div>',
  ].join('');
  document.body.appendChild(settingsPanel);

  // Load saved settings
  var savedSettings = {};
  try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch(e) {}

  function applyContrast(val) {
    document.body.classList.remove('contrast-bright','contrast-medium','contrast-dark');
    document.body.classList.add('contrast-' + val);
    document.querySelectorAll('.contrast-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-contrast') === val);
    });
  }

  function applyFontSize(val) {
    document.body.classList.remove('font-small','font-medium','font-large');
    document.body.classList.add('font-' + val);
    document.querySelectorAll('.fontsize-btn').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-size') === val);
    });
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings));
  }

  // Apply defaults (bright contrast, medium font)
  applyContrast(savedSettings.contrast || 'bright');
  applyFontSize(savedSettings.fontSize || 'medium');

  var motionToggle = document.getElementById('toggle-motion');
  if (savedSettings.reduceMotion) {
    motionToggle.checked = true;
    document.body.classList.add('reduce-motion');
  }

  // Contrast buttons
  settingsPanel.querySelectorAll('.contrast-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var val = btn.getAttribute('data-contrast');
      applyContrast(val);
      savedSettings.contrast = val;
      saveSettings();
    });
  });

  // Font size buttons
  settingsPanel.querySelectorAll('.fontsize-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var val = btn.getAttribute('data-size');
      applyFontSize(val);
      savedSettings.fontSize = val;
      saveSettings();
    });
  });

  // Reduce motion toggle
  motionToggle.addEventListener('change', function() {
    document.body.classList.toggle('reduce-motion', motionToggle.checked);
    savedSettings.reduceMotion = motionToggle.checked;
    saveSettings();
  });

  // Language select (placeholder — swap strings in future)
  var langSelect = document.getElementById('lang-select');
  langSelect.value = savedSettings.language || 'en';
  langSelect.addEventListener('change', function() {
    savedSettings.language = langSelect.value;
    saveSettings();
    // Future: swap page text to Swahili here
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

  var formatBar = document.createElement('div');
  formatBar.className = 'format-bar';
  formatBar.setAttribute('role','toolbar');
  formatBar.innerHTML = [
    '<select class="format-bar__select" id="fmt-font"><option value="">Font</option>',
    '<option value="\'Syne\',sans-serif">Syne</option>',
    '<option value="\'JetBrains Mono\',monospace">Mono</option>',
    '<option value="Georgia,serif">Serif</option>',
    '<option value="Arial,sans-serif">Arial</option></select>',
    '<select class="format-bar__select" id="fmt-size"><option value="">Size</option>',
    '<option value="11px">11</option><option value="13px">13</option>',
    '<option value="16px">16</option><option value="18px">18</option>',
    '<option value="20px">20</option><option value="24px">24</option>',
    '<option value="28px">28</option><option value="32px">32</option></select>',
    '<div class="format-bar__divider"></div>',
    '<button class="format-bar__btn" data-cmd="bold"          title="Bold"><b>B</b></button>',
    '<button class="format-bar__btn" data-cmd="italic"        title="Italic"><i>I</i></button>',
    '<button class="format-bar__btn" data-cmd="underline"     title="Underline"><u>U</u></button>',
    '<button class="format-bar__btn" data-cmd="strikeThrough" title="Strike"><s>S</s></button>',
    '<div class="format-bar__divider"></div>',
    '<label class="format-bar__color-wrap" title="Text colour">',
    '<span class="format-bar__color-icon">A</span>',
    '<input type="color" id="fmt-color" value="#DAA520"/></label>',
    '<label class="format-bar__color-wrap" title="Highlight">',
    '<span class="format-bar__color-icon fmt-hl">\u2590</span>',
    '<input type="color" id="fmt-highlight" value="#F0A500"/></label>',
    '<div class="format-bar__divider"></div>',
    '<button class="format-bar__btn" data-cmd="insertUnorderedList" title="Bullets">\u2630</button>',
    '<button class="format-bar__btn" data-cmd="insertOrderedList"   title="Numbered">\u2460</button>',
    '<div class="format-bar__divider"></div>',
    '<button class="format-bar__btn" data-cmd="justifyLeft"   title="Left">\u2261</button>',
    '<button class="format-bar__btn" data-cmd="justifyCenter" title="Centre">\u2261</button>',
    '<button class="format-bar__btn" data-cmd="justifyRight"  title="Right">\u2261</button>',
    '<div class="format-bar__divider"></div>',
    '<button class="format-bar__btn format-bar__btn--clear" data-cmd="removeFormat" title="Clear">\u2715</button>',
  ].join('');
  document.body.appendChild(formatBar);

  var savedRange = null;
  function hideFormatBar() { formatBar.classList.remove('visible'); }
  function showFormatBar(x, y) {
    var left = Math.min(x, window.innerWidth - 570);
    if (left < 8) left = 8;
    formatBar.style.left = left + 'px';
    formatBar.style.top  = (y - 52) + 'px';
    formatBar.classList.add('visible');
  }
  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
  }
  function execFmt(cmd, val) { restoreSelection(); document.execCommand(cmd, false, val || null); }

  formatBar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) { e.preventDefault(); execFmt(btn.getAttribute('data-cmd')); });
  });

  var fmtFont = document.getElementById('fmt-font');
  fmtFont.addEventListener('mousedown', function() {
    var sel = window.getSelection(); if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });
  fmtFont.addEventListener('change', function() { execFmt('fontName', this.value); this.value = ''; });

  var fmtSize = document.getElementById('fmt-size');
  fmtSize.addEventListener('mousedown', function() {
    var sel = window.getSelection(); if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });
  fmtSize.addEventListener('change', function() {
    restoreSelection();
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var span = document.createElement('span');
    span.style.fontSize = this.value;
    try { sel.getRangeAt(0).surroundContents(span); } catch(e) {}
    this.value = '';
  });

  var fmtColor = document.getElementById('fmt-color');
  fmtColor.addEventListener('mousedown', function() {
    var sel = window.getSelection(); if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });
  fmtColor.addEventListener('input', function() { execFmt('foreColor', this.value); });

  var fmtHL = document.getElementById('fmt-highlight');
  fmtHL.addEventListener('mousedown', function() {
    var sel = window.getSelection(); if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });
  fmtHL.addEventListener('input', function() { execFmt('hiliteColor', this.value); });

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
