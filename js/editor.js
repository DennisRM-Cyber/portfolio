/* ============================================================
   editor.js — Inline Content Editor + Owner Lock
   portfolio / Rubui Mwangi

   HOW IT WORKS:
   ─────────────────────────────────────────────────────────
   1. A floating lock button sits bottom-right.
      Clicking it opens the passphrase modal.

   2. When the correct passphrase is entered:
      - body gets class "owner-unlocked"
      - All .owner-only elements become visible (add cards, etc.)
      - The edit toolbar appears, ready to use
      - The lock button turns green

   3. Clicking LOCK:
      - body loses "owner-unlocked"
      - .owner-only elements hide again
      - Edit mode is disabled

   4. The edit toolbar works as before:
      ENABLE EDITING → click any amber-highlighted block → type
      SAVE → stores in localStorage under page-namespaced keys
      RESET → clears saved edits and reloads

   PASSPHRASE: Change OWNER_PASSPHRASE below.
   This is a client-side convenience lock, not cryptographic security.

   sessionStorage keeps you unlocked while the browser tab is open,
   so you don't re-enter the passphrase on every page navigation.
============================================================ */

(function initEditor() {

  /* ── CONFIG ─────────────────────────────────────────────── */
  const OWNER_PASSPHRASE = 'blueprint2025';   // ← change this
  const SESSION_KEY      = 'portfolio__owner__unlocked';


  /* ── INJECT LOCK BUTTON ─────────────────────────────────── */
  const lockBtn = document.createElement('button');
  lockBtn.className = 'lock-btn';
  lockBtn.setAttribute('aria-label', 'Owner lock');
  lockBtn.innerHTML = '<span class="lock-btn__icon">🔒</span><span class="lock-btn__text">OWNER</span>';
  document.body.appendChild(lockBtn);


  /* ── INJECT EDIT TOOLBAR ────────────────────────────────── */
  const toolbar = document.createElement('div');
  toolbar.className = 'edit-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Content editor');
  toolbar.style.display = 'none';  // hidden until unlocked

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


  /* ── LOCK OVERLAY (already in HTML) ─────────────────────── */
  var overlay    = document.getElementById('lock-overlay');
  var lockInput  = document.getElementById('lock-input');
  var lockSubmit = document.getElementById('lock-submit');
  var lockCancel = document.getElementById('lock-cancel');
  var lockError  = document.getElementById('lock-error');


  /* ── EDIT MODE STATE ────────────────────────────────────── */
  var editMode = false;

  function getEditables() {
    return document.querySelectorAll('[data-edit-id]');
  }

  function enableEditMode() {
    editMode = true;
    document.body.classList.add('edit-mode');
    getEditables().forEach(function(el) { el.setAttribute('contenteditable', 'true'); });
    dot.classList.add('active');
    label.classList.add('active');
    label.textContent = 'EDITING';
    btnToggle.textContent = 'STOP EDITING';
    btnToggle.classList.add('active');
    btnSave.classList.add('visible');
    btnReset.classList.add('visible');
  }

  function disableEditMode() {
    editMode = false;
    document.body.classList.remove('edit-mode');
    getEditables().forEach(function(el) { el.setAttribute('contenteditable', 'false'); });
    dot.classList.remove('active');
    label.classList.remove('active');
    label.textContent = 'EDIT MODE';
    btnToggle.textContent = 'ENABLE EDITING';
    btnToggle.classList.remove('active');
    btnSave.classList.remove('visible');
    btnReset.classList.remove('visible');
  }

  btnToggle.addEventListener('click', function() {
    editMode ? disableEditMode() : enableEditMode();
  });


  /* ── SAVE / RESET ───────────────────────────────────────── */
  var pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

  function storageKey(id) {
    return 'portfolio__edit__' + pageName + '__' + id;
  }

  function saveChanges() {
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.setItem(storageKey(id), el.innerHTML);
    });
    btnSave.textContent = 'SAVED \u2713';
    btnSave.style.background = '#4ade80';
    setTimeout(function() {
      btnSave.textContent = 'SAVE CHANGES';
      btnSave.style.background = '';
    }, 1800);
  }

  function loadSavedChanges() {
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) {
        var saved = localStorage.getItem(storageKey(id));
        if (saved !== null) el.innerHTML = saved;
      }
    });
  }

  btnSave.addEventListener('click', saveChanges);

  btnReset.addEventListener('click', function() {
    if (!window.confirm('Reset all changes on this page?\n\nOriginal HTML text will be restored.')) return;
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.removeItem(storageKey(id));
    });
    window.location.reload();
  });

  window.addEventListener('beforeunload', function() {
    if (editMode) saveChanges();
  });

  setTimeout(loadSavedChanges, 50);


  /* ── KEYBOARD SHORTCUTS ─────────────────────────────────── */
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      if (document.body.classList.contains('owner-unlocked')) {
        editMode ? disableEditMode() : enableEditMode();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && editMode) {
      e.preventDefault();
      saveChanges();
    }
    if (e.key === 'Escape' && overlay && overlay.classList.contains('visible')) {
      closeLockOverlay();
    }
  });


  /* ── LOCK / UNLOCK LOGIC ────────────────────────────────── */

  function unlock() {
    document.body.classList.add('owner-unlocked');
    sessionStorage.setItem(SESSION_KEY, '1');
    toolbar.style.display = '';
    lockBtn.innerHTML = '<span class="lock-btn__icon">\uD83D\uDD13</span><span class="lock-btn__text">LOCK</span>';
  }

  function lock() {
    document.body.classList.remove('owner-unlocked');
    sessionStorage.removeItem(SESSION_KEY);
    toolbar.style.display = 'none';
    disableEditMode();
    lockBtn.innerHTML = '<span class="lock-btn__icon">\uD83D\uDD12</span><span class="lock-btn__text">OWNER</span>';
  }

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
    if (document.body.classList.contains('owner-unlocked')) {
      lock();
    } else {
      openLockOverlay();
    }
  });

  if (lockSubmit) lockSubmit.addEventListener('click', tryUnlock);
  if (lockCancel) lockCancel.addEventListener('click', closeLockOverlay);
  if (lockInput)  lockInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') tryUnlock();
  });
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeLockOverlay();
    });
  }


  /* ── RESTORE SESSION across page navigation ─────────────── */
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    unlock();
  }


})();
