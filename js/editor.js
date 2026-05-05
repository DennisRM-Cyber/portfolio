/* ============================================================
   editor.js — Secured Editor + Owner Controls
   portfolio / Rubui Mwangi

   HOW IT WORKS:
   - All .owner-control and .owner-control--block elements are
     hidden via CSS by default — invisible to every visitor
   - Secret shortcut Ctrl+Shift+E opens a passphrase prompt
   - On correct passphrase → edit-mode class added to <body>
     which reveals ALL owner controls (add buttons, edit toolbar)
   - Content editing, add cards, and the toolbar are all gated
     behind the same single authentication
   - Auto-locks after 30 minutes of inactivity
   - Session persists across page navigation until tab closes

   FIRST-TIME SETUP:
   Press Ctrl+Shift+E → set a passphrase (min 6 chars)
   From then on: Ctrl+Shift+E → enter passphrase → full access
============================================================ */

(function initSecuredEditor() {
  'use strict';

  const CONFIG = {
    keyHash:    'pe__auth__hash',
    keySession: 'pe__auth__session',
    keyContent: 'pe__content__',
    timeout:    30 * 60 * 1000   /* 30 minutes */
  };

  let authenticated = false;
  let editActive    = false;
  let sessionTimer  = null;
  let toolbar       = null;

  /* ─── SHA-256 (Web Crypto — built into every modern browser) ─ */
  async function sha256(str) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /* ─── Session ─────────────────────────────────────────────── */
  function sessionSave() {
    sessionStorage.setItem(CONFIG.keySession,
      JSON.stringify({ expiry: Date.now() + CONFIG.timeout }));
  }
  function sessionValid() {
    try {
      const s = JSON.parse(sessionStorage.getItem(CONFIG.keySession) || '{}');
      return s.expiry && Date.now() < s.expiry;
    } catch { return false; }
  }
  function sessionClear() { sessionStorage.removeItem(CONFIG.keySession); }

  function resetTimer() {
    if (!authenticated) return;
    clearTimeout(sessionTimer);
    sessionSave();
    sessionTimer = setTimeout(() => lock('Session timed out.'), CONFIG.timeout);
  }

  /* ─── Passphrase ──────────────────────────────────────────── */
  const hasHash   = ()         => !!localStorage.getItem(CONFIG.keyHash);
  const saveHash  = async (p)  => localStorage.setItem(CONFIG.keyHash, await sha256(p.trim()));
  const checkHash = async (p)  => (await sha256(p.trim())) === localStorage.getItem(CONFIG.keyHash);

  /* ─── Modal ───────────────────────────────────────────────── */
  function showModal(mode) {
    document.getElementById('pe-modal')?.remove();
    const setup = mode === 'setup';
    const el = document.createElement('div');
    el.id = 'pe-modal';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:rgba(5,8,18,0.93)',
      'backdrop-filter:blur(20px)',
      '-webkit-backdrop-filter:blur(20px)',
      'display:flex;align-items:center;justify-content:center',
      "font-family:'JetBrains Mono',monospace"
    ].join(';');

    el.innerHTML = `
      <div style="background:rgba(8,13,28,0.99);border:1px solid rgba(240,165,0,0.32);
        border-radius:18px;padding:36px 40px;width:100%;max-width:400px;position:relative;
        box-shadow:0 24px 64px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.05);">
        <div style="position:absolute;top:0;left:15%;right:15%;height:1px;
          background:linear-gradient(90deg,transparent,rgba(240,165,0,0.6),transparent)"></div>

        <div style="font-size:9px;color:rgba(240,165,0,0.7);letter-spacing:.22em;margin-bottom:16px">
          // editor access
        </div>
        <div style="font-size:17px;font-weight:800;color:#fff;font-family:'Syne',sans-serif;margin-bottom:6px">
          ${setup ? 'Set your passphrase' : 'Enter passphrase'}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.38);margin-bottom:24px;line-height:1.6">
          ${setup
            ? 'Choose a passphrase to protect the editor.<br>Only the hash is stored — never the passphrase itself.'
            : 'Editor access is restricted to the site owner.'}
        </div>

        <input id="pe-p1" type="password" placeholder="${setup ? 'choose a passphrase...' : 'enter passphrase...'}"
          autocomplete="off"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);
            border:1px solid rgba(240,165,0,0.25);border-radius:10px;padding:12px 16px;
            color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;
            letter-spacing:.08em;outline:none;margin-bottom:8px;transition:border-color .2s" />

        ${setup ? `<input id="pe-p2" type="password" placeholder="confirm passphrase..."
          autocomplete="off"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);
            border:1px solid rgba(240,165,0,0.25);border-radius:10px;padding:12px 16px;
            color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;
            letter-spacing:.08em;outline:none;margin-bottom:8px" />` : ''}

        <div id="pe-err" style="font-size:10px;color:#f87171;letter-spacing:.1em;
          min-height:16px;margin-bottom:16px"></div>

        <div style="display:flex;gap:10px">
          <button id="pe-ok" style="flex:1;background:rgba(240,165,0,1);color:#080d1a;
            border:none;border-radius:10px;padding:12px;font-family:'JetBrains Mono',monospace;
            font-size:10px;font-weight:500;letter-spacing:.14em;cursor:pointer">
            ${setup ? 'SET PASSPHRASE' : 'UNLOCK'}
          </button>
          <button id="pe-x" style="background:transparent;color:rgba(255,255,255,.35);
            border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px 18px;
            font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;cursor:pointer">
            CANCEL
          </button>
        </div>
      </div>`;

    document.body.appendChild(el);

    const p1  = document.getElementById('pe-p1');
    const p2  = document.getElementById('pe-p2');
    const ok  = document.getElementById('pe-ok');
    const err = document.getElementById('pe-err');

    setTimeout(() => p1.focus(), 60);
    p1.addEventListener('focus', () => p1.style.borderColor = 'rgba(240,165,0,.65)');
    p1.addEventListener('blur',  () => p1.style.borderColor = 'rgba(240,165,0,.25)');

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter')  ok.click();
      if (e.key === 'Escape') el.remove();
    });
    document.getElementById('pe-x').addEventListener('click', () => el.remove());

    ok.addEventListener('click', async () => {
      const val = p1.value;
      if (!val || val.length < 6) { err.textContent = 'MINIMUM 6 CHARACTERS'; return; }

      if (setup) {
        if (val !== (p2?.value || '')) { err.textContent = 'PASSPHRASES DO NOT MATCH'; return; }
        await saveHash(val);
        el.remove();
        unlock();
      } else {
        ok.textContent = 'CHECKING...'; ok.disabled = true;
        if (await checkHash(val)) { el.remove(); unlock(); }
        else {
          err.textContent = 'INCORRECT PASSPHRASE';
          p1.value = ''; p1.focus();
          ok.textContent = 'UNLOCK'; ok.disabled = false;
        }
      }
    });
  }

  /* ─── UNLOCK — grants full owner access ──────────────────── */
  function unlock() {
    authenticated = true;
    editActive    = true;
    sessionSave();

    /* edit-mode on <body> reveals ALL owner controls at once:
       - .owner-control (inline, e.g. edit hints)
       - .owner-control--block (block, e.g. add cards)
       - contenteditable highlights
       - the toolbar itself                                    */
    document.body.classList.add('edit-mode');

    if (!toolbar) buildToolbar();
    toolbar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 20px;';

    // Make every labelled element editable
    getEditables().forEach(el => el.setAttribute('contenteditable', 'true'));

    // Load any previously saved edits
    loadContent();

    // Start inactivity watch
    ['mousemove','keydown','click','scroll'].forEach(e =>
      document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
  }

  /* ─── LOCK — removes all owner access ────────────────────── */
  function lock(msg) {
    authenticated = false;
    editActive    = false;
    clearTimeout(sessionTimer);
    sessionClear();

    document.body.classList.remove('edit-mode');
    if (toolbar) toolbar.style.display = 'none';
    getEditables().forEach(el => el.setAttribute('contenteditable', 'false'));

    ['mousemove','keydown','click','scroll'].forEach(e =>
      document.removeEventListener(e, resetTimer));

    if (msg) {
      const note = Object.assign(document.createElement('div'), { textContent: msg });
      note.style.cssText = [
        'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
        'background:rgba(8,13,28,.97);border:1px solid rgba(240,165,0,.3)',
        'border-radius:30px;padding:10px 22px',
        "font-family:'JetBrains Mono',monospace;font-size:10px",
        'color:rgba(240,165,0,.85);letter-spacing:.12em',
        'z-index:300;pointer-events:none'
      ].join(';');
      document.body.appendChild(note);
      setTimeout(() => note.remove(), 3500);
    }
  }

  function buildToolbar() {
    toolbar = document.createElement('div');
    toolbar.className = 'edit-toolbar';
    toolbar.style.display = 'none';
    toolbar.innerHTML = `
      <div class="edit-toolbar__dot active"></div>
      <span class="edit-toolbar__label active">OWNER MODE</span>
      <button class="edit-toolbar__btn edit-toolbar__btn--save" id="et-save">SAVE</button>
      <button class="edit-toolbar__btn edit-toolbar__btn--reset" id="et-reset">RESET PAGE</button>
      <button class="edit-toolbar__btn edit-toolbar__btn--reset" id="et-lock">LOCK</button>`;
    document.body.appendChild(toolbar);

    document.getElementById('et-save').addEventListener('click', saveContent);
    document.getElementById('et-reset').addEventListener('click', resetContent);
    document.getElementById('et-lock').addEventListener('click', () => lock('Editor locked.'));
  }

  /* ─── CONTENT persistence ─────────────────────────────────── */
  const page       = window.location.pathname.split('/').pop().replace('.html','') || 'index';
  const cKey       = id  => CONFIG.keyContent + page + '__' + id;
  const getEditables = () => document.querySelectorAll('[data-edit-id]');

  function saveContent() {
    getEditables().forEach(el => {
      const id = el.dataset.editId;
      if (id) localStorage.setItem(cKey(id), el.innerHTML);
    });
    const btn = document.getElementById('et-save');
    if (btn) {
      btn.textContent = 'SAVED ✓'; btn.style.background = '#4ade80';
      setTimeout(() => { btn.textContent = 'SAVE'; btn.style.background = ''; }, 1800);
    }
  }

  function loadContent() {
    getEditables().forEach(el => {
      const id = el.dataset.editId;
      if (id) { const s = localStorage.getItem(cKey(id)); if (s !== null) el.innerHTML = s; }
    });
  }

  function resetContent() {
    if (!confirm('Reset all saved edits on this page?\nOriginal HTML text will be restored.')) return;
    getEditables().forEach(el => { const id = el.dataset.editId; if (id) localStorage.removeItem(cKey(id)); });
    window.location.reload();
  }

  /* ─── SECRET SHORTCUT: Ctrl+Shift+E ──────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      if (authenticated) {
        // Toggle toolbar visibility while staying unlocked
        toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
      } else if (sessionValid()) {
        unlock();   // Silent restore — session still alive from another page
      } else {
        showModal(hasHash() ? 'verify' : 'setup');
      }
    }
    // Ctrl+S saves while unlocked
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && authenticated) {
      e.preventDefault(); saveContent();
    }
  });

  /* ─── Auto-save on page navigation ───────────────────────── */
  window.addEventListener('beforeunload', () => { if (authenticated) saveContent(); });

  /* ─── Restore session silently on page load ──────────────── */
  if (sessionValid()) setTimeout(unlock, 80);

})();
