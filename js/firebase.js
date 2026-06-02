/* ============================================================
   js/firebase.js  —  Portfolio Firebase shared module
   v1.0 — eng-rubui-portfolio

   Load order in every HTML page (before main.js and editor.js):
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
     <script src="js/firebase.js"></script>

   Exposes: window.PF  (Portfolio Firebase)

   Public API summary:
     PF.signIn(email, pass)        → Promise  (owner auth)
     PF.signOut()                  → Promise
     PF.isOwner()                  → Boolean
     PF.onAuth(callback)           → unsubscribe fn

     PF.watchLike(id, cb)          → unsubscribe fn  (real-time)
     PF.toggleLike(id)             → Promise

     PF.loadEdits(cb)              → void  (one-time read)
     PF.saveEdit(id, html)         → Promise  (owner only)
     PF.saveAllEdits(map)          → Promise  (owner only)

     PF.loadArticle(id, cb)        → void
     PF.saveArticle(id, html, ttl) → Promise  (owner only)

     PF.watchComments(cb)          → unsubscribe fn  (real-time)
     PF.publishComment(obj)        → Promise  (owner only)
     PF.deleteComment(key)         → Promise  (owner only)

     PF.submitForReview(obj)       → Promise  (public)
     PF.loadSubmissions(cb)        → void     (owner only)
============================================================ */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  var CFG = {
    apiKey:            'AIzaSyB-7ON-YjPT2Dxa3fO9WdfaBlSBZQfiECI',
    authDomain:        'eng-rubui-portfolio.firebaseapp.com',
    databaseURL:       'https://eng-rubui-portfolio-default-rtdb.firebaseio.com',
    projectId:         'eng-rubui-portfolio',
    storageBucket:     'eng-rubui-portfolio.firebasestorage.app',
    messagingSenderId: '37176321870',
    appId:             '1:37176321870:web:27612cfce969f03b1be01f'
  };

  /* ── INIT ───────────────────────────────────────────────── */
  if (!firebase.apps.length) {
    firebase.initializeApp(CFG);
  }

  var db   = firebase.database();
  var auth = firebase.auth();

  /* Keep the owner signed in across browser restarts.
     LOCAL = survives tab close; SESSION = only this tab. */
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch(function (e) { console.warn('[PF] persistence:', e.message); });


  /* ── ANONYMOUS VOTER ID ─────────────────────────────────── */
  /* Each browser gets a stable random ID so we can track
     per-browser like state without requiring a login.
     No PII — just a random hex string in localStorage.       */
  var VOTER_KEY = 'pf_vid';

  function getVoterId() {
    var id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = 'v' + Date.now().toString(36) +
               Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem(VOTER_KEY, id); } catch (e) {}
    }
    return id;
  }


  /* ── PUBLIC API ─────────────────────────────────────────── */
  window.PF = {

    /* ════════════════════════════════════════════════════════
       AUTH
    ════════════════════════════════════════════════════════ */

    /** Sign the owner in. Returns Promise. */
    signIn: function (email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },

    /** Sign out. Returns Promise. */
    signOut: function () {
      return auth.signOut();
    },

    /** True when owner is currently signed in to Firebase. */
    isOwner: function () {
      return !!auth.currentUser;
    },

    /**
     * Subscribe to auth state changes.
     * callback(user) — user is null when signed out.
     * Returns an unsubscribe function.
     */
    onAuth: function (callback) {
      return auth.onAuthStateChanged(callback);
    },


    /* ════════════════════════════════════════════════════════
       GLOBAL LIKES
       Public read + public write (with server validation).
       Uses Firebase transactions to prevent race conditions.
       Count is validated server-side to only allow ±1 changes.
    ════════════════════════════════════════════════════════ */

    /**
     * Subscribe to a like node in real-time.
     * callback(count, isLikedByThisBrowser)
     * Returns unsubscribe function — call it on page unload
     * if you want to stop listening (not strictly required
     * for a page-scoped listener but good practice).
     */
    watchLike: function (likeId, callback) {
      var vid = getVoterId();
      var ref = db.ref('likes/' + likeId);

      var handler = function (snap) {
        var data   = snap.val() || {};
        var count  = typeof data.count  === 'number' ? data.count : 0;
        var voters = data.voters || {};
        callback(count, !!voters[vid]);
      };

      ref.on('value', handler);
      /* Return unsubscribe */
      return function () { ref.off('value', handler); };
    },

    /**
     * Toggle like for this browser.
     * One like per browser per likeId — enforced client-side
     * via voter map, and server-side via ±1 count rule.
     * Returns Promise.
     */
    toggleLike: function (likeId) {
      var vid = getVoterId();
      var ref = db.ref('likes/' + likeId);

      return ref.transaction(function (current) {
        /* Firebase transaction: read current, return new value.
           Returning undefined aborts the transaction (no write). */
        if (current === null) current = { count: 0, voters: {} };
        var voters = current.voters || {};
        var count  = typeof current.count === 'number' ? current.count : 0;

        if (voters[vid]) {
          /* Already liked — remove like */
          count = Math.max(0, count - 1);
          delete voters[vid];
        } else {
          /* Not liked — add like */
          count += 1;
          voters[vid] = true;
        }

        return { count: count, voters: voters };
      });
    },


    /* ════════════════════════════════════════════════════════
       TEXT EDITS  (data-edit-id attributes)
       Owner writes, everyone reads.
       Firebase is the source of truth; localStorage is gone.
    ════════════════════════════════════════════════════════ */

    /**
     * Load all saved edits in one read.
     * callback(editsObject) where keys = edit-IDs, values = HTML strings.
     * Call on every page load before rendering.
     */
    loadEdits: function (callback) {
      db.ref('edits').once('value', function (snap) {
        callback(snap.val() || {});
      });
    },

    /**
     * Subscribe to all edits in real-time (fires instantly from in-memory cache
     * on repeat visits, then again when network responds).
     * callback(editsObject) — keys = edit-IDs, values = HTML strings.
     * Returns unsubscribe function. Use instead of loadEdits for zero-flash loads.
     */
    watchEdits: function (callback) {
      var ref     = db.ref('edits');
      var handler = function (snap) { callback(snap.val() || {}); };
      ref.on('value', handler);
      return function () { ref.off('value', handler); };
    },

    /**
     * Save a single edit. Requires owner auth.
     * editId  = data-edit-id value
     * html    = innerHTML string
     * Returns Promise.
     */
    saveEdit: function (editId, html) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('edits/' + editId).set(html);
    },

    /**
     * Save all edits on a page in one write.
     * editsMap = { 'editId-1': '<b>html</b>', 'editId-2': 'text', … }
     * Returns Promise.
     */
    saveAllEdits: function (editsMap) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('edits').update(editsMap);
    },


    /* ════════════════════════════════════════════════════════
       ARTICLES
       Owner writes full article HTML; everyone reads.
       Falls back to the hardcoded HTML default if no Firebase
       entry exists yet (backward compatible).
    ════════════════════════════════════════════════════════ */

    /**
     * Load article from Firebase.
     * callback({ content, title, updatedAt }) or null if not saved yet.
     */
    loadArticle: function (articleId, callback) {
      db.ref('articles/' + articleId).once('value', function (snap) {
        callback(snap.val());
      });
    },

    /**
     * Save article content and title. Requires owner auth.
     * Returns Promise.
     */
    saveArticle: function (articleId, content, title) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('articles/' + articleId).set({
        content:   content,
        title:     title,
        updatedAt: Date.now()
      });
    },


    /* ════════════════════════════════════════════════════════
       PUBLISHED COMMENTS
       Owner approves and publishes; everyone reads.
       Visitors submit to /submissions (separate path).
    ════════════════════════════════════════════════════════ */

    /**
     * Subscribe to published comments in real-time.
     * callback(commentsArray) — newest first, each item has ._key.
     * Returns unsubscribe function.
     */
    watchComments: function (callback) {
      var ref     = db.ref('comments').orderByChild('timestamp');
      var handler = function (snap) {
        var arr = [];
        snap.forEach(function (child) {
          var c  = child.val();
          c._key = child.key;
          arr.push(c);
        });
        callback(arr.reverse()); /* newest first */
      };

      ref.on('value', handler);
      return function () { ref.off('value', handler); };
    },

    /**
     * Publish an approved comment. Requires owner auth.
     * comment = { name, text, type, date }
     * Returns Promise.
     */
    publishComment: function (comment) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('comments').push({
        name:      (comment.name  || '').slice(0, 100),
        text:      (comment.text  || '').slice(0, 2000),
        type:      (comment.type  || 'Recommendation').slice(0, 50),
        date:      comment.date   ||
                   new Date().toLocaleDateString('en-GB', {
                     day: 'numeric', month: 'short', year: 'numeric'
                   }),
        timestamp: Date.now()
      });
    },

    /**
     * Delete a published comment. Requires owner auth.
     * key = comment._key from watchComments callback.
     * Returns Promise.
     */
    deleteComment: function (key) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('comments/' + key).remove();
    },


    /* ════════════════════════════════════════════════════════
       SUBMISSIONS  (public → owner inbox)
       Anyone can write. Only the authenticated owner can read.
       Owner reviews in Firebase console or via loadSubmissions(),
       then calls publishComment() to put approved ones live.
    ════════════════════════════════════════════════════════ */

    /**
     * Submit a recommendation for owner review.
     * data = { name, email, text, type }
     * Returns Promise.
     */
    submitForReview: function (data) {
      return db.ref('submissions').push({
        name:      (data.name  || '').slice(0, 100),
        email:     (data.email || '').slice(0, 200),
        text:      (data.text  || '').slice(0, 2000),
        type:      (data.type  || 'Recommendation').slice(0, 50),
        timestamp: Date.now(),
        status:    'pending'
      });
    },

    /**
     * Load all submissions. Requires owner auth.
     * callback(submissionsArray) — newest first, each has ._key and .status.
     */
    loadSubmissions: function (callback) {
      if (!auth.currentUser) {
        console.warn('[PF] loadSubmissions: not signed in');
        return;
      }
      db.ref('submissions').orderByChild('timestamp').once('value', function (snap) {
        var arr = [];
        snap.forEach(function (child) {
          var s  = child.val();
          s._key = child.key;
          arr.push(s);
        });
        callback(arr.reverse());
      });
    },

    /**
     * Update a submission status (e.g. 'approved' or 'rejected').
     * Requires owner auth. Returns Promise.
     */
    updateSubmission: function (key, status) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('submissions/' + key + '/status').set(status);
    },

    /**
     * Delete all saved edits for one page (Reset button).
     * Requires owner auth. Returns Promise.
     */
    clearPageEdits: function (pageName) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('edits/' + pageName).remove();
    },


    /* ════════════════════════════════════════════════════════
       MEDIA COLLECTIONS
       Images live in Cloudinary; URLs + captions live here.
       Path: collections/<collId>/items/<pushKey>
             → { url, caption, ts }
    ════════════════════════════════════════════════════════ */

    /** Subscribe to a collection — fires on load then on every change.
     *  callback(itemsArray) sorted oldest-first, each item has ._key.
     *  Returns unsubscribe function. */
    watchCollection: function (collId, callback) {
      var ref     = db.ref('collections/' + collId + '/items');
      var handler = function (snap) {
        var items = [];
        snap.forEach(function (child) {
          var item  = child.val();
          item._key = child.key;
          items.push(item);
        });
        items.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
        callback(items);
      };
      ref.on('value', handler);
      return function () { ref.off('value', handler); };
    },

    /** Add a Cloudinary URL to a collection. Owner auth required. Returns Promise. */
    addCollectionItem: function (collId, url, caption) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('collections/' + collId + '/items').push({
        url:     url,
        caption: caption || '',
        ts:      Date.now()
      });
    },

    /** Remove an item by Firebase push key. Owner auth required. Returns Promise. */
    removeCollectionItem: function (collId, itemKey) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('collections/' + collId + '/items/' + itemKey).remove();
    },

    /** Update an item caption. Owner auth required. Returns Promise. */
    updateCollectionCaption: function (collId, itemKey, caption) {
      if (!auth.currentUser) return Promise.reject(new Error('Not signed in to Firebase'));
      return db.ref('collections/' + collId + '/items/' + itemKey + '/caption').set(caption);
    },


    /* ════════════════════════════════════════════════════════
       PAGE VIEW COUNTER
       Simple privacy-first analytics — your data, your DB.
       Count-only increments; no IP, no fingerprint stored.
       Path: pageviews/<pageName>  →  number
    ════════════════════════════════════════════════════════ */

    /** Increment the view count for a page. Fire-and-forget. */
    trackPageView: function (pageName) {
      db.ref('pageviews/' + pageName).transaction(function (current) {
        return (current || 0) + 1;
      });
    },

    /**
     * Subscribe to all page view counts in real-time.
     * callback(countsObject) — keys = page slugs, values = counts.
     * Returns unsubscribe function.
     */
    watchPageViews: function (callback) {
      var ref     = db.ref('pageviews');
      var handler = function (snap) { callback(snap.val() || {}); };
      ref.on('value', handler);
      return function () { ref.off('value', handler); };
    }


    /* ════════════════════════════════════════════════════════
       SHARED FIREBASE SIGN-IN MODAL
       One modal definition for the whole site.
       Called from editor.js, about.html, projects.html, etc.
       requireFirebaseAuth(onAuthenticated, onCancel)
         onAuthenticated(user) — called on success
         onCancel(err)         — called when user cancels (optional)
       ensureOwnerSignIn()     — same thing as a Promise.
    ════════════════════════════════════════════════════════ */

    requireFirebaseAuth: function (onAuthenticated, onCancel) {
      if (auth.currentUser) { onAuthenticated(auth.currentUser); return function () {}; }

      var existing = document.getElementById('pf-signin-modal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'pf-signin-modal';
      modal.style.cssText = [
        'position:fixed;inset:0;z-index:10000',
        'background:rgba(3,6,14,0.88)',
        'backdrop-filter:blur(18px)',
        '-webkit-backdrop-filter:blur(18px)',
        'display:flex;align-items:center;justify-content:center',
        'animation:_pfModalIn 0.18s ease'
      ].join(';');

      modal.innerHTML = [
        '<style>',
        '@keyframes _pfModalIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}',
        '#pf-signin-modal .fb-box{background:rgba(14,20,44,0.98);border:1px solid rgba(240,165,0,0.28);border-radius:16px;padding:32px 36px 28px;width:min(400px,90vw);box-shadow:0 32px 80px rgba(0,0,0,0.7);}',
        '#pf-signin-modal .fb-label{font-family:JetBrains Mono,monospace;font-size:9px;letter-spacing:0.18em;color:rgba(240,165,0,0.55);margin-bottom:8px;}',
        '#pf-signin-modal .fb-title{font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#f0f4ff;margin-bottom:6px;}',
        '#pf-signin-modal .fb-hint{font-size:12px;color:rgba(180,190,220,0.65);line-height:1.6;margin-bottom:24px;}',
        '#pf-signin-modal .fb-field{margin-bottom:14px;}',
        '#pf-signin-modal .fb-field label{display:block;font-family:JetBrains Mono,monospace;font-size:8px;letter-spacing:0.15em;color:rgba(240,165,0,0.6);margin-bottom:5px;}',
        '#pf-signin-modal .fb-input{width:100%;box-sizing:border-box;background:rgba(8,14,30,0.9);border:1px solid rgba(240,165,0,0.2);border-radius:8px;padding:10px 14px;color:#f0f4ff;font-family:JetBrains Mono,monospace;font-size:13px;outline:none;transition:border-color 0.18s;}',
        '#pf-signin-modal .fb-input:focus{border-color:rgba(240,165,0,0.6);}',
        '#pf-signin-modal .fb-input.error{border-color:#f87171!important;}',
        '#pf-signin-modal .fb-error{font-family:JetBrains Mono,monospace;font-size:9px;color:#f87171;min-height:16px;margin-bottom:18px;letter-spacing:0.08em;}',
        '#pf-signin-modal .fb-actions{display:flex;gap:10px;}',
        '#pf-signin-modal .fb-btn-sign{flex:1;padding:12px;border-radius:10px;background:#F0A500;border:none;color:#0d1526;font-family:JetBrains Mono,monospace;font-size:10px;font-weight:700;letter-spacing:0.14em;cursor:pointer;transition:opacity 0.18s;}',
        '#pf-signin-modal .fb-btn-sign:hover{opacity:0.88;}',
        '#pf-signin-modal .fb-btn-sign:disabled{opacity:0.4;cursor:default;}',
        '#pf-signin-modal .fb-btn-cancel{padding:12px 18px;border-radius:10px;background:transparent;border:1px solid rgba(248,113,113,0.35);color:#f87171;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.12em;cursor:pointer;transition:background 0.15s;}',
        '#pf-signin-modal .fb-btn-cancel:hover{background:rgba(248,113,113,0.1);}',
        '</style>',
        '<div class="fb-box">',
        '  <div class="fb-label">// firebase auth</div>',
        '  <div class="fb-title">Sign in to save</div>',
        '  <div class="fb-hint">Enter your Firebase owner credentials.</div>',
        '  <div class="fb-field">',
        '    <label for="pf-email">EMAIL</label>',
        '    <input class="fb-input" id="pf-email" type="email" placeholder="owner@email.com" autocomplete="email" />',
        '  </div>',
        '  <div class="fb-field">',
        '    <label for="pf-pass">PASSWORD</label>',
        '    <input class="fb-input" id="pf-pass" type="password" placeholder="Firebase password" autocomplete="current-password" />',
        '  </div>',
        '  <div class="fb-error" id="pf-fb-error"></div>',
        '  <div class="fb-actions">',
        '    <button class="fb-btn-sign" id="pf-sign-btn">SIGN IN</button>',
        '    <button class="fb-btn-cancel" id="pf-cancel-btn">CANCEL</button>',
        '  </div>',
        '</div>'
      ].join('');

      document.body.appendChild(modal);

      var emailEl   = modal.querySelector('#pf-email');
      var passEl    = modal.querySelector('#pf-pass');
      var errorEl   = modal.querySelector('#pf-fb-error');
      var signBtn   = modal.querySelector('#pf-sign-btn');
      var cancelBtn = modal.querySelector('#pf-cancel-btn');

      setTimeout(function () { if (emailEl) emailEl.focus(); }, 80);

      function closeModal() {
        modal.style.animation = '_pfModalIn 0.15s ease reverse';
        setTimeout(function () { if (modal.parentNode) modal.remove(); }, 140);
      }
      function setError(msg) {
        errorEl.textContent = msg;
        emailEl.classList.toggle('error', !!msg);
        passEl.classList.toggle('error',  !!msg);
      }
      function doSignIn() {
        var email = emailEl.value.trim();
        var pass  = passEl.value;
        if (!email || !pass) { setError('Both fields are required.'); return; }
        setError('');
        signBtn.disabled    = true;
        signBtn.textContent = 'SIGNING IN\u2026';
        auth.signInWithEmailAndPassword(email, pass)
          .then(function (result) {
            closeModal();
            onAuthenticated(result.user || result);
          })
          .catch(function (err) {
            signBtn.disabled    = false;
            signBtn.textContent = 'SIGN IN';
            var msg = err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
              ? 'Incorrect email or password.'
              : err.code === 'auth/too-many-requests'
              ? 'Too many attempts. Wait and try again.'
              : err.code === 'auth/network-request-failed'
              ? 'Network error. Check your connection.'
              : (err.message || 'Sign-in failed.');
            setError(msg);
            passEl.value = '';
            passEl.focus();
          });
      }

      signBtn.addEventListener('click', doSignIn);
      passEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignIn(); });

      function cancel() {
        closeModal();
        if (typeof onCancel === 'function') onCancel(new Error('cancelled'));
      }
      cancelBtn.addEventListener('click', cancel);
      modal.addEventListener('click', function (e) { if (e.target === modal) cancel(); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cancel(); }
      });

      return closeModal;
    },

    /**
     * Promise-based wrapper around requireFirebaseAuth.
     * Resolves with user when signed in, rejects on cancel/error.
     */
    ensureOwnerSignIn: function () {
      var self = this;
      if (auth.currentUser) return Promise.resolve(auth.currentUser);
      return new Promise(function (resolve, reject) {
        self.requireFirebaseAuth(resolve, reject);
      });
    },

  }; /* end window.PF */

})();
