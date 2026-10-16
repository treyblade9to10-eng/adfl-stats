// Cloud sync (Firebase). Everyone who opens the site sees the same league; only the owner (signed in with Google) can change it.
// Cloud copy lives at /adfl/league = { rev, at, by, data: '<league JSON>' }. Drafts of half-recorded games stay on each device.
(function (G) {
  const A = G.ADFL;
  const CONFIG = {
    apiKey: 'AIzaSyDkw-xjR0eAkCPR3BRQyKk0Rnusu3pbEmw',
    authDomain: 'cardio-game-3713.firebaseapp.com',
    databaseURL: 'https://cardio-game-3713-default-rtdb.firebaseio.com',
    projectId: 'cardio-game-3713',
  };
  const META = 'adfl-sync-meta';
  const st = {
    ready: false, online: false, user: null, owner: null, editors: {}, keyOK: false, remote: null, // remote = { rev, at, by } (data not kept here)
    lastPushed: null, pushing: false, error: null, applying: false,
  };
  let db = null, pushT = null;
  const meta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; } };
  const setMeta = o => localStorage.setItem(META, JSON.stringify(Object.assign(meta(), o)));

  // The part of the league that gets shared (everything except half-done drafts).
  function sharedJSON(S) { const o = Object.assign({}, S); delete o.drafts; return JSON.stringify(o); }

  // Editors: the owner, anyone the owner added, or anyone who unlocked this device with the editor code.
  // A brand-new league can be claimed only by a Google account (not by a code-only device).
  const canEdit = () => !!(st.user && (st.owner === st.user.uid || st.editors[st.user.uid] || st.keyOK || (!st.owner && st.ownerLoaded && !st.user.isAnonymous)));
  let keyRef = null;
  function watchKey(u) {
    if (keyRef) { keyRef.off(); keyRef = null; }
    st.keyOK = false;
    if (!u || !db) return;
    keyRef = db.ref('adflkeys/' + u.uid);
    keyRef.on('value', s => { st.keyOK = s.val() != null; paint(); if (st.keyOK) A.sync.changed(); if (A.ui && /^#\/settings/.test(location.hash)) A.ui.render(); }, () => { st.keyOK = false; });
  }
  const cloudHasLeague = () => !!(st.remote && st.remote.rev);

  A.sync = {
    state: st,
    canEdit,
    // Looking but not allowed to change: there's a cloud league and you aren't its owner.
    viewOnly: () => st.ready && cloudHasLeague() && !canEdit(),
    status() {
      if (!st.ready) return { cls: 'off', text: 'Offline / local only' };
      if (st.error) return { cls: 'err', text: 'Sync problem' };
      if (!cloudHasLeague()) return { cls: 'off', text: st.user ? 'Not uploaded yet' : 'Local only' };
      if (!canEdit()) return { cls: 'view', text: 'View only' };
      if (st.pushing || meta().dirty) return { cls: 'busy', text: 'Saving to cloud...' };
      return { cls: 'ok', text: 'Synced' };
    },

    start() {
      if (typeof firebase === 'undefined') { paint(); return; }
      try {
        if (!firebase.apps.length) firebase.initializeApp(CONFIG);
        db = firebase.database();
        st.ready = true;
        db.ref('.info/connected').on('value', s => { st.online = !!s.val(); paint(); });
        db.ref('adfl/owner').on('value', s => { st.owner = s.val(); st.ownerLoaded = true; paint(); maybeFirstUpload(); A.sync.changed(); });
        db.ref('adfl/editors').on('value', s => { st.editors = s.val() || {}; paint(); });
        db.ref('adfl/league').on('value', s => onRemote(s.val()), e => { st.error = e.message; paint(); });
        firebase.auth().onAuthStateChanged(u => { st.user = u; watchKey(u); paint(); maybeFirstUpload(); if (u) A.sync.changed(); });
      } catch (e) { st.error = e.message; st.ready = false; }
      paint();
    },

    signIn() {
      if (!st.ready) return A.ui.toast('Cloud is not available right now (are you offline?)');
      const p = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(p).catch(e => {
        if (e && e.code === 'auth/popup-blocked') firebase.auth().signInWithRedirect(p);
        else A.ui.toast('Sign in did not work: ' + (e && e.message ? e.message : e));
      });
    },
    signOut() { if (st.ready) firebase.auth().signOut(); },

    // Unlock editing with the league code. The app never knows the real code: Firebase's rules check it,
    // and a wrong code is simply refused.
    async enterCode(code) {
      if (!st.ready) throw new Error('The cloud is not available right now (are you offline?)');
      code = String(code || '').trim();
      if (!code) throw new Error('Type the code first');
      if (!st.user) {
        try { await firebase.auth().signInAnonymously(); }
        catch (e) {
          if (e && e.code === 'auth/operation-not-allowed') throw new Error('Code-only sign in is turned off in Firebase. Sign in with Google first, then enter the code.');
          throw e;
        }
      }
      const u = firebase.auth().currentUser;
      try { await db.ref('adflkeys/' + u.uid).set(code); }
      catch (e) { if (u.isAnonymous) await firebase.auth().signOut(); throw new Error('Wrong code'); }
      st.keyOK = true; paint(); A.sync.changed();
      return true;
    },
    // Lock this device again (stops editing here).
    async lock() {
      const u = st.user; if (!u) return;
      try { await db.ref('adflkeys/' + u.uid).remove(); } catch (e) { }
      st.keyOK = false;
      if (u.isAnonymous) await firebase.auth().signOut();
      paint();
    },

    // Called after every local save.
    changed() {
      if (st.applying || !st.ready) return;
      const S = A.store.state; if (!S) return;
      const js = sharedJSON(S);
      if (js === st.lastPushed) return;
      if (!canEdit()) return;
      setMeta({ dirty: true });
      clearTimeout(pushT); pushT = setTimeout(push, 1200);
      paint();
    },
    pushNow() { clearTimeout(pushT); return push(); },
    // Replace this device's league with the cloud one.
    useCloud() { if (st.lastRemoteData) applyRemote(st.lastRemoteData, st.remote); },
  };

  async function push() {
    if (!canEdit() || !db) return;
    const S = A.store.state, js = sharedJSON(S), base = meta().baseRev || 0;
    st.pushing = true; st.pendingJS = js; paint();
    try {
      if (!st.owner) await db.ref('adfl/owner').set(st.user.uid);
      let conflict = false;
      const res = await db.ref('adfl/league').transaction(cur => {
        if (cur && cur.rev && cur.rev !== base) { conflict = true; return; }   // someone (another device) saved first
        return { rev: base + 1, at: Date.now(), by: st.user.uid, data: js };
      }, null, false);
      if (res.committed) { st.lastPushed = js; if (sharedJSON(A.store.state) === js) setMeta({ baseRev: base + 1, dirty: false }); else { setMeta({ baseRev: base + 1 }); A.sync.changed(); } st.error = null; }
      else if (conflict) conflictPrompt();
    } catch (e) { st.error = e.message; A.ui.toast('Could not save to the cloud: ' + e.message); }
    st.pushing = false; st.pendingJS = null; paint();
  }

  function onRemote(v) {
    st.remote = v ? { rev: v.rev, at: v.at, by: v.by } : null;
    st.lastRemoteData = v;
    if (!v) { paint(); maybeFirstUpload(); return; }
    const m = meta();
    if (v.rev === m.baseRev) {   // already have this one
      st.lastPushed = st.lastPushed || v.data;
      if (canEdit() && sharedJSON(A.store.state) !== v.data) { st.lastPushed = v.data; A.sync.changed(); }   // this device fixed something up (like the new numbers): send it
      paint(); return;
    }
    // our own save coming back to us (can arrive before the save finishes): just remember its number
    if (v.data === st.pendingJS || v.data === sharedJSON(A.store.state)) { st.lastPushed = v.data; setMeta({ baseRev: v.rev, dirty: false }); paint(); return; }
    if (m.dirty && canEdit()) { conflictPrompt(); return; }
    applyRemote(v);
  }

  function applyRemote(v) {
    let data; try { data = JSON.parse(v.data); } catch (e) { st.error = 'Cloud copy is damaged'; paint(); return; }
    st.applying = true;
    A.store.replaceShared(data);
    st.applying = false;
    st.lastPushed = v.data;
    setMeta({ baseRev: v.rev, dirty: false });
    A.ui.season = Math.min(A.ui.season || data.seasonNow, data.seasonNow) || data.seasonNow;
    A.ui.fillSeasonSel();
    if (!/^#\/(record|live)\//.test(location.hash)) { A.ui.keepScroll = true; A.ui.render(); }
    paint();
  }

  // First time the owner signs in and the cloud is empty: upload this device's league.
  function maybeFirstUpload() {
    if (!st.user || !st.ready || st.remote === undefined) return;
    if (st.lastRemoteData === undefined) return;          // haven't heard from the cloud yet
    if (!cloudHasLeague() && canEdit()) { setMeta({ dirty: true, baseRev: 0 }); push(); }
  }

  function conflictPrompt() {
    const UI = A.ui;
    const m = UI.modal(`<h3>Two versions of the league</h3><p>This device has changes that aren't in the cloud yet, and the cloud has newer changes from another device.</p>
      <p class="dim">Pick one to keep. The other one gets replaced (you can still undo from Settings).</p>
      <div class="row end"><button id="kcl">Use the cloud version</button><button class="gold" id="kdv">Keep this device's version</button></div>`, 'small');
    // always read the newest cloud copy right when you choose
    const latest = async () => { const v = (await db.ref('adfl/league').once('value')).val(); st.lastRemoteData = v; st.remote = v ? { rev: v.rev, at: v.at, by: v.by } : null; return v; };
    m.querySelector('#kcl').onclick = async () => { UI.closeModal(); A.store.snapshotPrev(); setMeta({ dirty: false }); const v = await latest(); if (v) applyRemote(v); };
    m.querySelector('#kdv').onclick = async () => { UI.closeModal(); const v = await latest(); setMeta({ baseRev: v ? v.rev : 0, dirty: true }); push(); };
  }

  function paint() {
    const el = document.getElementById('syncPill'); if (!el) return;
    const s = A.sync.status();
    el.className = 'syncpill ' + s.cls; el.textContent = s.text;
  }
  A.sync.paint = paint;
})(globalThis);
