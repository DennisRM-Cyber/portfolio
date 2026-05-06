/* ============================================================
   editor.js — Owner Lock + Inline Editor + Format Toolbar
   portfolio / Rubui Mwangi
   v3 — Add cards create real editable cards; text selection
        pops a Word-style formatting toolbar.
============================================================ */

(function initEditor() {

  /* ── CONFIG ─────────────────────────────────────────────── */
  const OWNER_PASSPHRASE = 'blueprint2025';   // ← change this
  const SESSION_KEY      = 'portfolio__owner__unlocked';


  /* ══════════════════════════════════════════════════════════
     PART 1 — LOCK OVERLAY + LOCK BUTTON
  ══════════════════════════════════════════════════════════ */

  const lockBtn = document.createElement('button');
  lockBtn.className = 'lock-btn';
  lockBtn.setAttribute('aria-label', 'Owner lock');
  lockBtn.innerHTML = '<span class="lock-btn__icon">🔒</span><span class="lock-btn__text">OWNER</span>';
  document.body.appendChild(lockBtn);

  const overlay    = document.getElementById('lock-overlay');
  const lockInput  = document.getElementById('lock-input');
  const lockSubmit = document.getElementById('lock-submit');
  const lockCancel = document.getElementById('lock-cancel');
  const lockError  = document.getElementById('lock-error');

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
     PART 2 — EDIT TOOLBAR (shown only when unlocked)
  ══════════════════════════════════════════════════════════ */

  const toolbar = document.createElement('div');
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

  var editMode = false;

  function getEditables() {
    return document.querySelectorAll('[data-edit-id]');
  }

  function enableEditMode() {
    editMode = true;
    document.body.classList.add('edit-mode');
    getEditables().forEach(function(el) { el.setAttribute('contenteditable', 'true'); });
    // also make any dynamically-added cards editable
    document.querySelectorAll('.new-card [contenteditable]').forEach(function(el) {
      el.setAttribute('contenteditable', 'true');
    });
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
    document.querySelectorAll('.new-card [contenteditable]').forEach(function(el) {
      el.setAttribute('contenteditable', 'false');
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

  var pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

  function storageKey(id) { return 'portfolio__edit__' + pageName + '__' + id; }

  function saveChanges() {
    // Save named editables
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.setItem(storageKey(id), el.innerHTML);
    });
    // Save dynamically added cards as a JSON array
    var dynamicCards = [];
    document.querySelectorAll('.new-card').forEach(function(card) {
      dynamicCards.push(card.outerHTML);
    });
    localStorage.setItem(storageKey('__dynamic_cards__'), JSON.stringify(dynamicCards));

    btnSave.textContent = 'SAVED ✓';
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
    // Restore dynamic cards
    var saved = localStorage.getItem(storageKey('__dynamic_cards__'));
    if (saved) {
      try {
        var cards = JSON.parse(saved);
        cards.forEach(function(html) {
          var tmp = document.createElement('div');
          tmp.innerHTML = html;
          var card = tmp.firstElementChild;
          if (!card) return;
          // Find which add-btn container to insert before
          var addCard = document.querySelector('.exp-card--add');
          if (addCard) {
            addCard.parentNode.insertBefore(card, addCard);
          }
          wireNewCard(card);
        });
      } catch(e) {}
    }
  }

  btnSave.addEventListener('click', saveChanges);

  btnReset.addEventListener('click', function() {
    if (!window.confirm('Reset all changes on this page?\n\nAll saved edits and added cards will be removed.')) return;
    getEditables().forEach(function(el) {
      var id = el.getAttribute('data-edit-id');
      if (id) localStorage.removeItem(storageKey(id));
    });
    localStorage.removeItem(storageKey('__dynamic_cards__'));
    window.location.reload();
  });

  window.addEventListener('beforeunload', function() { if (editMode) saveChanges(); });
  setTimeout(loadSavedChanges, 80);


  /* ══════════════════════════════════════════════════════════
     PART 4 — ADD CARD BUTTONS
     Clicking an add card inserts a real editable card above it.
     The add card stays in place for future use.
  ══════════════════════════════════════════════════════════ */

  // Template for a new experience card
  function makeExpCardHTML(uid) {
    return [
      '<div class="exp-card new-card fade-in visible" data-new-id="' + uid + '">',
      '  <button class="new-card__delete owner-only" title="Delete this card" aria-label="Delete card">✕</button>',
      '  <div class="exp-card__org" contenteditable="false">ORGANISATION NAME</div>',
      '  <div class="exp-card__role" contenteditable="false">Job Title / Role</div>',
      '  <div class="exp-card__meta" contenteditable="false">Month Year – Month Year &nbsp;·&nbsp; Location</div>',
      '  <ul class="exp-card__bullets">',
      '    <li contenteditable="false">Describe what you did and the impact it had.</li>',
      '    <li contenteditable="false">Add another achievement or responsibility.</li>',
      '    <li contenteditable="false">Include tools, techniques, or outcomes.</li>',
      '  </ul>',
      '</div>'
    ].join('\n');
  }

  // Template for a new nav card (index.html)
  function makeNavCardHTML(uid) {
    return [
      '<a href="#" class="nav-card new-card" data-new-id="' + uid + '">',
      '  <button class="new-card__delete owner-only" title="Delete this card" aria-label="Delete card">✕</button>',
      '  <div class="nav-card__tag" contenteditable="false">0X / LABEL</div>',
      '  <div class="nav-card__title" contenteditable="false">Section Title</div>',
      '  <div class="nav-card__desc" contenteditable="false">Short description of this section.</div>',
      '  <span class="nav-card__arrow" aria-hidden="true">↗</span>',
      '</a>'
    ].join('\n');
  }

  function uid() {
    return 'card-' + Date.now() + '-' + Math.floor(Math.random() * 9999);
  }

  function wireNewCard(card) {
    // Wire the delete button
    var delBtn = card.querySelector('.new-card__delete');
    if (delBtn) {
      delBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Remove this card?')) {
          card.remove();
          if (editMode) saveChanges();
        }
      });
    }
    // If edit mode is already on, make its fields editable
    if (editMode) {
      card.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.setAttribute('contenteditable', 'true');
      });
    }
  }

  function handleAddCardClick(addCard) {
    // Determine which template to use based on context
    var isExpCard = addCard.classList.contains('exp-card--add');
    var isNavCard = addCard.classList.contains('card--add');
    var id = uid();
    var html = isExpCard ? makeExpCardHTML(id) : makeNavCardHTML(id);

    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var newCard = tmp.firstElementChild;

    addCard.parentNode.insertBefore(newCard, addCard);
    wireNewCard(newCard);

    // Auto-enable edit mode and focus the first field
    if (!editMode) enableEditMode();
    var firstField = newCard.querySelector('[contenteditable]');
    if (firstField) {
      firstField.setAttribute('contenteditable', 'true');
      setTimeout(function() {
        firstField.focus();
        // Select all text so user can just start typing
        var range = document.createRange();
        range.selectNodeContents(firstField);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 50);
    }
  }

  // Wire add cards — present now and any added later
  function wireAddCards() {
    document.querySelectorAll('.exp-card--add, .card--add').forEach(function(addCard) {
      if (addCard._wired) return;
      addCard._wired = true;
      addCard.addEventListener('click', function(e) {
        e.preventDefault();
        if (!document.body.classList.contains('owner-unlocked')) return;
        handleAddCardClick(addCard);
      });
    });
  }
  wireAddCards();


  /* ══════════════════════════════════════════════════════════
     PART 5 — FLOATING FORMAT TOOLBAR
     Appears near selected text while in edit mode.
     Offers: bold, italic, underline, font size, text colour,
     highlight, ordered/unordered list, remove formatting.
  ══════════════════════════════════════════════════════════ */

  var formatBar = document.createElement('div');
  formatBar.className = 'format-bar';
  formatBar.setAttribute('role', 'toolbar');
  formatBar.setAttribute('aria-label', 'Text formatting');
  formatBar.innerHTML = [
    // Font family
    '<select class="format-bar__select" id="fmt-font" title="Font">',
    '  <option value="">Font</option>',
    '  <option value="\'Syne\', sans-serif">Syne</option>',
    '  <option value="\'JetBrains Mono\', monospace">Mono</option>',
    '  <option value="Georgia, serif">Serif</option>',
    '  <option value="Arial, sans-serif">Arial</option>',
    '</select>',
    // Font size
    '<select class="format-bar__select" id="fmt-size" title="Size">',
    '  <option value="">Size</option>',
    '  <option value="11px">11</option>',
    '  <option value="12px">12</option>',
    '  <option value="13px">13</option>',
    '  <option value="14px">14</option>',
    '  <option value="16px">16</option>',
    '  <option value="18px">18</option>',
    '  <option value="20px">20</option>',
    '  <option value="24px">24</option>',
    '  <option value="28px">28</option>',
    '  <option value="32px">32</option>',
    '</select>',
    '<div class="format-bar__divider"></div>',
    // B / I / U
    '<button class="format-bar__btn" data-cmd="bold"          title="Bold (Ctrl+B)"><b>B</b></button>',
    '<button class="format-bar__btn" data-cmd="italic"        title="Italic (Ctrl+I)"><i>I</i></button>',
    '<button class="format-bar__btn" data-cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></button>',
    '<button class="format-bar__btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>',
    '<div class="format-bar__divider"></div>',
    // Colour
    '<label class="format-bar__color-wrap" title="Text colour">',
    '  <span class="format-bar__color-icon">A</span>',
    '  <input type="color" id="fmt-color" value="#DAA520" />',
    '</label>',
    // Highlight
    '<label class="format-bar__color-wrap" title="Highlight">',
    '  <span class="format-bar__color-icon fmt-hl">▐</span>',
    '  <input type="color" id="fmt-highlight" value="#F0A500" />',
    '</label>',
    '<div class="format-bar__divider"></div>',
    // Lists
    '<button class="format-bar__btn" data-cmd="insertUnorderedList" title="Bullet list">☰</button>',
    '<button class="format-bar__btn" data-cmd="insertOrderedList"   title="Numbered list">①</button>',
    '<div class="format-bar__divider"></div>',
    // Align
    '<button class="format-bar__btn" data-cmd="justifyLeft"   title="Align left">⬡</button>',
    '<button class="format-bar__btn" data-cmd="justifyCenter" title="Centre">≡</button>',
    '<button class="format-bar__btn" data-cmd="justifyRight"  title="Align right">⬢</button>',
    '<div class="format-bar__divider"></div>',
    // Clear
    '<button class="format-bar__btn format-bar__btn--clear" data-cmd="removeFormat" title="Clear formatting">✕</button>',
  ].join('');
  document.body.appendChild(formatBar);

  var savedRange = null;

  function hideFormatBar() {
    formatBar.classList.remove('visible');
  }

  function showFormatBar(x, y) {
    // Keep bar within viewport
    var barW = 560;
    var left = Math.min(x, window.innerWidth - barW - 12);
    if (left < 8) left = 8;
    formatBar.style.left = left + 'px';
    formatBar.style.top  = (y - 52) + 'px';
    formatBar.classList.add('visible');
  }

  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function execFmt(cmd, value) {
    restoreSelection();
    document.execCommand(cmd, false, value || null);
  }

  // Command buttons
  formatBar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault(); // don't lose selection
      var cmd = btn.getAttribute('data-cmd');
      execFmt(cmd);
    });
  });

  // Font family
  document.getElementById('fmt-font').addEventListener('mousedown', function(e) {
    savedRange = window.getSelection().getRangeAt(0).cloneRange();
  });
  document.getElementById('fmt-font').addEventListener('change', function() {
    execFmt('fontName', this.value);
    this.value = '';
  });

  // Font size
  document.getElementById('fmt-size').addEventListener('mousedown', function(e) {
    savedRange = window.getSelection().getRangeAt(0).cloneRange();
  });
  document.getElementById('fmt-size').addEventListener('change', function() {
    // execCommand fontSize only accepts 1-7; we wrap in a span instead
    restoreSelection();
    var size = this.value;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var span = document.createElement('span');
    span.style.fontSize = size;
    range.surroundContents(span);
    this.value = '';
  });

  // Text colour
  var fmtColor = document.getElementById('fmt-color');
  fmtColor.addEventListener('mousedown', function() {
    savedRange = window.getSelection().getRangeAt(0).cloneRange();
  });
  fmtColor.addEventListener('input', function() {
    execFmt('foreColor', this.value);
  });

  // Highlight
  var fmtHL = document.getElementById('fmt-highlight');
  fmtHL.addEventListener('mousedown', function() {
    savedRange = window.getSelection().getRangeAt(0).cloneRange();
  });
  fmtHL.addEventListener('input', function() {
    execFmt('hiliteColor', this.value);
  });

  // Show/hide on selection change
  document.addEventListener('selectionchange', function() {
    if (!editMode) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      // Small delay so clicks on the bar itself don't hide it
      setTimeout(function() {
        var active = document.activeElement;
        if (!formatBar.contains(active) && !formatBar.matches(':hover')) {
          hideFormatBar();
        }
      }, 120);
      return;
    }
    // Check selection is inside an editable
    var anchor = sel.anchorNode;
    var inEditable = false;
    var node = anchor;
    while (node) {
      if (node.getAttribute && (node.getAttribute('contenteditable') === 'true' || node.getAttribute('data-edit-id'))) {
        inEditable = true; break;
      }
      node = node.parentNode;
    }
    if (!inEditable) return;

    savedRange = sel.getRangeAt(0).cloneRange();
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    var x = rect.left + window.scrollX + (rect.width / 2) - 280;
    var y = rect.top  + window.scrollY;
    showFormatBar(x, y);
  });

  // Don't hide when interacting with the bar
  formatBar.addEventListener('mousedown', function(e) {
    // Save selection before any button steals focus
    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  });


  /* ══════════════════════════════════════════════════════════
     PART 6 — LOCK / UNLOCK
  ══════════════════════════════════════════════════════════ */

  function unlock() {
    document.body.classList.add('owner-unlocked');
    sessionStorage.setItem(SESSION_KEY, '1');
    toolbar.style.display = '';
    lockBtn.innerHTML = '<span class="lock-btn__icon">🔓</span><span class="lock-btn__text">LOCK</span>';
    wireAddCards();
  }

  function lock() {
    document.body.classList.remove('owner-unlocked');
    sessionStorage.removeItem(SESSION_KEY);
    toolbar.style.display = 'none';
    disableEditMode();
    lockBtn.innerHTML = '<span class="lock-btn__icon">🔒</span><span class="lock-btn__text">OWNER</span>';
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();


  /* ══════════════════════════════════════════════════════════
     PART 7 — KEYBOARD SHORTCUTS
  ══════════════════════════════════════════════════════════ */

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
    if (e.key === 'Escape') {
      if (overlay && overlay.classList.contains('visible')) closeLockOverlay();
      else hideFormatBar();
    }
  });

})();
