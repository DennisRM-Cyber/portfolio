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
    }

  }; /* end window.PF */

})();
