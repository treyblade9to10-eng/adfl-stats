// Saved data: lives in this browser (localStorage). Export a backup file from Settings now and then.
(function (G) {
  const A = G.ADFL;
  const KEY = 'adfl-stats-v1', PREV = 'adfl-stats-prev';
  let S = null;
  const hooks = [];
  A.onGameSaved = fn => hooks.push(fn);

  function fresh() {
    const r = A.makeAllRosters(1);
    const st = { names2: true, numbers2: true, v: 1, seasonNow: 1, players: {}, nextPid: r.nextId, games: [], picks: [], awards: [], drafts: {}, nextId: 1, created: Date.now() };
    r.players.forEach(p => st.players[p.id] = p);
    S = st;
    addSeasonGames(1);
    return st;
  }

  // v1.2: new, less repetitive player names. Only renames players still wearing an old auto-made name (your own edits stay).
  // v1.5: receivers all wore 80-89. Give WRs realistic numbers (mostly 1-19). Same result on every device.
  function upgrade(st) { const a = migrate(st), b = renamePlayers(st), c = renumberWRs(st); return a || b || c; }

  function renumberWRs(st) {
    if (st.numbers2) return false;
    A.TEAMS.forEach(t => {
      const ros = Object.values(st.players).filter(p => p.team === t.id);
      const wrs = ros.filter(p => p.pos === 'WR').sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
      const used = new Set(ros.filter(p => p.pos !== 'WR').map(p => p.num));
      const r = A.rng(t.id.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 11) + 777);
      let has80 = false;
      wrs.forEach(p => { p.num = A.pickNumber(has80 ? 'WR_LOW' : 'WR', used, r); if (p.num >= 80) has80 = true; used.add(p.num); });
    });
    st.numbers2 = true;
    return true;
  }

  function renamePlayers(st) {
    if (st.names2) return false;
    const ps = Object.values(st.players).sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
    const fresh = A.uniqueNames(ps, 1);
    ps.forEach(p => {
      const parts = String(p.name).split(' ');
      if (parts.length === 2 && A.OLD_NAMES.first.has(parts[0]) && A.OLD_NAMES.last.has(parts[1])) p.name = fresh[p.id];
    });
    st.names2 = true;
    return true;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { }
  }

  // v1.1: Chick-fil-A left the league, Wingstop took its spot. Everything recorded under CFA moves to WNG.
  function migrate(st) {
    if (!JSON.stringify(st).includes('"CFA"') && !JSON.stringify(st).includes(':CFA:')) return false;
    const fix = v => v === 'CFA' ? 'WNG' : v;
    Object.values(st.players).forEach(p => p.team = fix(p.team));
    st.games.forEach(g => {
      g.home = fix(g.home); g.away = fix(g.away);
      if (g.box) Object.values(g.box).forEach(ln => ln.t = fix(ln.t));
    });
    st.picks.forEach(p => { p.tid = fix(p.tid); p.id = p.id.replace(':CFA:', ':WNG:'); });
    st.awards.forEach(a => a.tid = fix(a.tid));
    Object.values(st.drafts || {}).forEach(d => Object.values(d.box || {}).forEach(ln => ln.t = fix(ln.t)));
    Object.values(st.drafts || {}).forEach(d => { if (d.rows) Object.keys(d.rows).forEach(k => { if (k.startsWith('CFA:')) { d.rows['WNG:' + k.slice(4)] = d.rows[k]; delete d.rows[k]; } }); });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { }
    return true;
  }

  function addSeasonGames(season) {
    const sched = A.makeSchedule(season);
    sched.forEach((g, i) => S.games.push({
      id: `s${season}w${g.week}g${i}`, season, week: g.week, type: 'reg', kind: g.kind, home: g.home, away: g.away, played: false,
    }));
  }

  A.store = {
    get state() { return S; },
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); if (upgrade(S)) try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } return S; } } catch (e) { console.warn('load failed', e); }
      fresh(); this.save(); return S;
    },
    save() {
      if (A.sync && A.sync.viewOnly() && !A.sync.state.applying) {   // looking, not allowed to change: undo the change
        if (A.ui) A.ui.toast('View only. Enter the editor code in Settings to make changes.');
        A.sync.useCloud(); return;
      }
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { alert('Could not save (storage full?). Export a backup from Settings.'); }
      if (A.sync) A.sync.changed();
    },
    // A newer league arrived from the cloud. Keep this device's unfinished drafts.
    replaceShared(data) {
      data.drafts = (S && S.drafts) || {};
      S = data;
      // an editor device fixes up old cloud data once and sends it back up
      if (upgrade(S) && A.sync) setTimeout(() => A.sync.changed(), 0);
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
    },
    snapshotPrev() { try { localStorage.setItem(PREV, JSON.stringify(S)); } catch (e) { } },
    hasPrev() { return !!localStorage.getItem(PREV); },
    undoLast() { const raw = localStorage.getItem(PREV); if (!raw) return false; localStorage.setItem(KEY, raw); S = JSON.parse(raw); return true; },
    exportJSON() { return JSON.stringify(S); },
    importJSON(txt) { const o = JSON.parse(txt); if (!o || !o.games || !o.players) throw new Error('That file is not an ADFL backup.'); this.snapshotPrev(); S = o; this.save(); },
    resetAll() { this.snapshotPrev(); fresh(); this.save(); },

    // ----- seasons -----
    seasonGames(season) { return S.games.filter(g => g.season === season); },
    regGames(season) { return S.games.filter(g => g.season === season && g.type === 'reg'); },
    playedGames(season) { return S.games.filter(g => g.played && (season == null || g.season === season)); },
    seasons() { return [...new Set(S.games.map(g => g.season))].sort((a, b) => a - b); },
    game(id) { return S.games.find(g => g.id === id); },
    newSeason() {
      this.snapshotPrev();
      const n = Math.max(...this.seasons()) + 1;
      S.seasonNow = n;
      Object.values(S.players).forEach(p => p.rookie = false);
      addSeasonGames(n);
      this.save(); return n;
    },
    // The season the app should show by default: the newest with games.
    currentWeek(season) {
      const gs = this.seasonGames(season).filter(g => !g.played);
      if (!gs.length) return null;
      return Math.min(...gs.map(g => g.week));
    },
    champion(season) {
      const f = S.games.find(g => g.season === season && g.round === 'FINAL' && g.played);
      return f ? { team: A.winnerOf(f), game: f } : null;
    },

    // ----- players -----
    P(pid) { return S.players[pid]; },
    pName(pid) { const p = S.players[pid]; return p ? p.name : pid; },
    roster(tid) {
      const order = A.POSITIONS;
      return Object.values(S.players).filter(p => p.team === tid)
        .sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr);
    },
    freeAgents() { return Object.values(S.players).filter(p => !p.team); },
    addPlayer(o) { const id = 'p' + (S.nextPid++); S.players[id] = Object.assign({ id, name: 'New Player', num: 0, pos: 'WR', team: null, ovr: 70, rookie: false }, o, { id }); this.save(); return id; },
    updatePlayer(pid, o) { Object.assign(S.players[pid], o); this.save(); },

    // ----- games -----
    newDraft(g) {
      const q = { home: [null, null, null, null, null], away: [null, null, null, null, null] };
      return { q, firstScore: '', ot: false, team: { home: {}, away: {} }, box: {}, pog: '', notes: '' };
    },
    draftFor(g) {
      if (S.drafts[g.id]) return S.drafts[g.id];
      if (g.played) return JSON.parse(JSON.stringify({ q: g.q, firstScore: g.firstScore || '', ot: !!g.ot, team: g.team || { home: {}, away: {} }, box: g.box || {}, pog: g.pog || '', notes: g.notes || '' }));
      return this.newDraft(g);
    },
    saveDraft(g, d) { S.drafts[g.id] = d; this.save(); },
    clearDraft(g) { delete S.drafts[g.id]; this.save(); },

    // d = finished draft. Returns {ok, error}
    saveGame(g, d) {
      const q = { home: d.q.home.map(v => v === '' ? null : v), away: d.q.away.map(v => v === '' ? null : v) };
      const hs = A.sumQ(q.home), as = A.sumQ(q.away);
      if (g.type === 'playoff' && hs === as) return { ok: false, error: 'Playoff games need a winner - add the overtime score.' };
      this.snapshotPrev();
      const box = {};
      for (const pid in d.box) {
        const ln = d.box[pid], clean = {}; let any = false;
        for (const k of A.ALLKEYS) { const v = ln[k]; if (v !== '' && v != null && !isNaN(+v)) { clean[k] = +v; if (+v !== 0) any = true; } }
        if (!any && !Object.keys(clean).length) continue;
        clean.t = ln.t || (S.players[pid] && S.players[pid].team);
        box[pid] = clean;
      }
      const team = { home: {}, away: {} };
      for (const side of ['home', 'away']) for (const k in (d.team[side] || {})) { const v = d.team[side][k]; if (v !== '' && v != null) team[side][k] = k === 'top' ? A.parseTop(v) : +v; }
      Object.assign(g, { played: true, q, hs, as, ot: !!d.ot || q.home[4] != null || q.away[4] != null, firstScore: d.firstScore || null, team, box, pog: d.pog || null, notes: d.notes || '', pbp: d.pbp || g.pbp || null, playedAt: Date.now() });
      delete S.drafts[g.id];
      if (g.type === 'reg') dropOpenPlayoffs(g.season);   // seeds may have changed: rebuild the bracket
      ensurePlayoffs(g.season);
      hooks.forEach(fn => fn(g));
      this.save();
      return { ok: true };
    },
    unplay(g) {
      this.snapshotPrev();
      ['q', 'hs', 'as', 'ot', 'firstScore', 'team', 'box', 'pog', 'notes', 'pbp', 'playedAt'].forEach(k => delete g[k]);
      g.played = false;
      if (g.type === 'reg') dropOpenPlayoffs(g.season);
      S.picks.forEach(p => { if (p.gameId === g.id) { p.result = null; p.actual = null; } });
      this.save();
    },
    lockedByPlayoffs(g) {
      // A regular season game cannot be edited once playoff games exist without hurting the bracket.
      if (g.type === 'reg') return S.games.some(x => x.season === g.season && x.type === 'playoff' && x.played);
      if (g.round === 'SEMI') return S.games.some(x => x.season === g.season && x.round === 'CONF');
      if (g.round === 'CONF') return S.games.some(x => x.season === g.season && x.round === 'FINAL');
      return false;
    },

    // ----- awards -----
    awardsFor(filter) { return S.awards.filter(a => Object.keys(filter || {}).every(k => a[k] === filter[k])); },
    giveAward(a) {
      // one winner per award slot (season + type + week)
      S.awards = S.awards.filter(x => !(x.season === a.season && x.type === a.type && (x.week || 0) === (a.week || 0) && (x.conf || '') === (a.conf || '')));
      if (a.pid || a.tid) S.awards.push(Object.assign({ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5) }, a));
      this.save();
    },
  };

  // ---------- playoffs ----------
  function seedsFor(season) {
    const games = S.games.filter(g => g.season === season && g.type === 'reg');
    const st = A.standings(games);
    const seeds = {};
    st.confs.forEach(c => { seeds[c.conf.id] = c.order.slice(0, 4); });
    return { seeds, aggs: st.aggs };
  }

  function mk(season, week, round, home, away, hSeed, aSeed, conf) {
    return { id: `s${season}p${week}${conf || 'F'}${S.games.length}`, season, week, type: 'playoff', round, conf: conf || null, home, away, seeds: { home: hSeed, away: aSeed }, played: false };
  }

  function dropOpenPlayoffs(season) { S.games = S.games.filter(x => !(x.season === season && x.type === 'playoff' && !x.played)); }

  function ensurePlayoffs(season) {
    const reg = S.games.filter(g => g.season === season && g.type === 'reg');
    if (!reg.length || !reg.every(g => g.played)) return;
    const po = r => S.games.filter(g => g.season === season && g.round === r);
    const { seeds, aggs } = seedsFor(season);
    if (!po('SEMI').length) {
      A.CONFS.forEach(c => {
        const s = seeds[c.id];
        S.games.push(mk(season, 11, 'SEMI', s[0], s[3], 1, 4, c.id));
        S.games.push(mk(season, 11, 'SEMI', s[1], s[2], 2, 3, c.id));
      });
      return;
    }
    const semis = po('SEMI');
    if (semis.every(g => g.played) && !po('CONF').length) {
      A.CONFS.forEach(c => {
        const sg = semis.filter(g => g.conf === c.id);
        const w = sg.map(g => { const t = A.winnerOf(g); return { t, seed: g.home === t ? g.seeds.home : g.seeds.away }; }).sort((a, b) => a.seed - b.seed);
        S.games.push(mk(season, 12, 'CONF', w[0].t, w[1].t, w[0].seed, w[1].seed, c.id));
      });
      return;
    }
    const conf = po('CONF');
    if (conf.length && conf.every(g => g.played) && !po('FINAL').length) {
      const ch = conf.map(g => A.winnerOf(g));
      ch.sort((a, b) => (aggs[b].pct - aggs[a].pct) || (aggs[b].diff - aggs[a].diff) || (a < b ? -1 : 1));
      S.games.push(mk(season, 13, 'FINAL', ch[0], ch[1], null, null, null));
    }
  }
  A.ensurePlayoffs = ensurePlayoffs;
})(globalThis);
