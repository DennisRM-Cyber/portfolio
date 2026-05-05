/* ============================================================
   editor.js — Inline Content Editor
   portfolio / Rubui Mwangi

   WHAT THIS DOES:
   Adds a floating toolbar to every page that lets you:
   1. Toggle "Edit Mode" — highlights every editable text block
   2. Click any highlighted block and type your changes directly
   3. Save — stores all changes in your browser (localStorage)
   4. Reset — clears saved changes and restores original text

   HOW CHANGES ARE SAVED:
   Each editable element needs a unique data-edit-id attribute.
   When you save, the script reads the text of every element
   with that attribute and stores it under that ID key.
   On page load, it reads back and re-applies your saved text.

   LEARNING NOTE — localStorage:
   localStorage is a browser API that stores key-value pairs
   permanently on your computer (until you clear browser data).
   It works offline, needs no server, and persists across sessions.
   Think of it as a tiny notepad your browser keeps for this site.

   IMPORTANT — this is for LOCAL EDITING ONLY.
   Changes saved here live in YOUR browser on YOUR computer.
   To make changes permanent for everyone (like a real visitor),
   you still need to edit the HTML files and push to GitHub.
   This tool is for drafting, tweaking tone, and reviewing
   phrasing before you commit changes to the actual files.
============================================================ */


(function initEditor() {

  /* ── STEP 1: Build and inject the floating toolbar ───────── */

  const toolbar = document.createElement('div');
  toolbar.className = 'edit-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Content editor');

  toolbar.innerHTML = `
    <div class="edit-toolbar__dot" id="edit-dot"></div>
    <span class="edit-toolbar__label" id="edit-label">EDIT MODE</span>
    <button class="edit-toolbar__btn edit-toolbar__btn--toggle" id="btn-toggle">
      ENABLE EDITING
    </button>
    <button class="edit-toolbar__btn edit-toolbar__btn--save" id="btn-save">
      SAVE CHANGES
    </button>
    <button class="edit-toolbar__btn edit-toolbar__btn--reset" id="btn-reset">
      RESET
    </button>
  `;

  document.body.appendChild(toolbar);

  const dot       = document.getElementById('edit-dot');
  const label     = document.getElementById('edit-label');
  const btnToggle = document.getElementById('btn-toggle');
  const btnSave   = document.getElementById('btn-save');
  const btnReset  = document.getElementById('btn-reset');


  /* ── STEP 2: Track edit mode state ───────────────────────── */

  let editMode = false;

  function enableEditMode() {
    editMode = true;
    document.body.classList.add('edit-mode');

    // Make every editable element actually editable
    getEditables().forEach(el => {
      el.setAttribute('contenteditable', 'true');
    });

    // Update toolbar UI
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

    // Remove contenteditable from all elements
    getEditables().forEach(el => {
      el.setAttribute('contenteditable', 'false');
    });

    // Update toolbar UI
    dot.classList.remove('active');
    label.classList.remove('active');
    label.textContent = 'EDIT MODE';
    btnToggle.textContent = 'ENABLE EDITING';
    btnToggle.classList.remove('active');
    btnSave.classList.remove('visible');
    btnReset.classList.remove('visible');
  }

  btnToggle.addEventListener('click', function() {
    if (editMode) {
      disableEditMode();
    } else {
      enableEditMode();
    }
  });


  /* ── STEP 3: Save changes to localStorage ─────────────────
     Storage key format:  portfolio__edit__PAGENAME__ELEMENTID
     This namespacing prevents conflicts between pages.
  ──────────────────────────────────────────────────────────── */

  // Get the current page name to namespace storage keys
  const pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

  function storageKey(id) {
    return 'portfolio__edit__' + pageName + '__' + id;
  }

  function saveChanges() {
    let savedCount = 0;
    getEditables().forEach(function(el) {
      const id = el.getAttribute('data-edit-id');
      if (id) {
        localStorage.setItem(storageKey(id), el.innerHTML);
        savedCount++;
      }
    });

    // Visual feedback on the save button
    btnSave.textContent = 'SAVED ✓';
    btnSave.style.background = '#4ade80';
    setTimeout(function() {
      btnSave.textContent = 'SAVE CHANGES';
      btnSave.style.background = '';
    }, 1800);
  }

  btnSave.addEventListener('click', saveChanges);


  /* ── STEP 4: Load saved changes on page open ─────────────── */

  function loadSavedChanges() {
    getEditables().forEach(function(el) {
      const id = el.getAttribute('data-edit-id');
      if (id) {
        const saved = localStorage.getItem(storageKey(id));
        if (saved !== null) {
          el.innerHTML = saved;
        }
      }
    });
  }


  /* ── STEP 5: Reset — clear all saved changes ─────────────── */

  btnReset.addEventListener('click', function() {
    const confirmed = window.confirm(
      'Reset all changes on this page?\n\nThis will restore the original text from your HTML files. ' +
      'Any edits you saved in the browser will be cleared.'
    );
    if (!confirmed) return;

    getEditables().forEach(function(el) {
      const id = el.getAttribute('data-edit-id');
      if (id) {
        localStorage.removeItem(storageKey(id));
      }
    });

    // Reload to restore original HTML
    window.location.reload();
  });


  /* ── STEP 6: Helper — get all editable elements ──────────── */

  function getEditables() {
    return document.querySelectorAll('[data-edit-id]');
  }


  /* ── STEP 7: Auto-save when user leaves the page ─────────── 
     If editing is active and the user navigates away,
     save automatically so no changes are lost.
  ──────────────────────────────────────────────────────────── */

  window.addEventListener('beforeunload', function() {
    if (editMode) {
      saveChanges();
    }
  });


  /* ── STEP 8: Load saved content immediately on page load ──── */

  // Small delay ensures DOM is fully ready
  setTimeout(loadSavedChanges, 50);


  /* ── STEP 9: Keyboard shortcut — Ctrl+E to toggle edit mode ─ */

  document.addEventListener('keydown', function(e) {
    // Ctrl+E (Windows/Linux) or Cmd+E (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault(); // stop browser's default Ctrl+E
      if (editMode) {
        disableEditMode();
      } else {
        enableEditMode();
      }
    }
    // Ctrl+S to save while in edit mode
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && editMode) {
      e.preventDefault();
      saveChanges();
    }
  });


})(); // end initEditor
