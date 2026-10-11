// Over/Under Picks. No money, no coins, no wagers: just you vs. the line, and the app keeps your record.
// Lines come from each player's recent games; you can nudge a line before you lock a pick in.
(function (G) {
  const A = G.ADFL;
  const n0 = A.num;
  const S = () => A.store.state;

  // key, label, positions that get it, depth slots (how many players per team), baseline function, value reader
  const DEFS = [
    { key: 'py', label: 'Passing yards', pos: ['QB'], n: 1, base: p => 150 + (p.ovr - 70) * 4, get: l => n0(l.py) },
    { key: 'ptd', label: 'Passing TDs', pos: ['QB'], n: 1, base: () => 1.5, get: l => n0(l.ptd) },
    { key: 'ry', label: 'Rushing yards', pos: ['RB'], n: 1, base: p => 50 + (p.ovr - 70) * 1.5, get: l => n0(l.ry) },
    { key: 'recy', label: 'Receiving yards', pos: ['WR', 'TE'], n: 2, base: p => 48 + (p.ovr - 70) * 1.6, get: l => n0(l.recy) },
    { key: 'rec', label: 'Receptions', pos: ['WR'], n: 1, base: () => 4.5, get: l => n0(l.rec) },
    { key: 'tds', label: 'Touchdowns (scored)', pos: ['RB', 'WR'], n: 1, base: () => .5, get: l => n0(l.rtd) + n0(l.rectd) },
    { key: 'tkl', label: 'Tackles', pos: ['LB', 'S'], n: 1, base: () => 5.5, get: l => n0(l.tkl) },
    { key: 'sck', label: 'Sacks', pos: ['DL', 'LB'], n: 1, base: () => .5, get: l => n0(l.sck) },
    { key: 'fgm', label: 'Field goals made', pos: ['K'], n: 1, base: () => 1.5, get: l => n0(l.fgm) },
  ];
  const defOf = k => DEFS.find(d => d.key === k);

  const half = v => Math.floor(v) + .5;

  // The player's team games, newest last, with their value for the stat (0 if they did not record anything).
  function history(pid, def, beforeGame) {
    const p = S().players[pid]; if (!p) return [];
    const games = S().games.filter(g => g.played && g.id !== (beforeGame && beforeGame.id) && (g.box && g.box[pid]) )
      .sort((a, b) => a.season - b.season || a.week - b.week);
    // include team games where he did not log anything as zeros, but only after his first logged game
    const all = S().games.filter(g => g.played && g.id !== (beforeGame && beforeGame.id) && (g.home === p.team || g.away === p.team))
      .sort((a, b) => a.season - b.season || a.week - b.week);
    const first = games[0]; if (!first) return [];
    const vals = [];
    for (const g of all) {
      if ((g.season - first.season || g.week - first.week) < 0) continue;
      const ln = g.box && g.box[pid];
      vals.push({ g, v: ln ? def.get(ln) : 0 });
    }
    return vals;
  }

  A.props = {
    DEFS,
    history(pid, key, beforeGame) { return history(pid, defOf(key), beforeGame); },
    lineFor(pid, key, beforeGame) {
      const def = defOf(key), p = S().players[pid];
      const h = history(pid, def, beforeGame).slice(-6);
      const base = def.base(p);
      const sum = h.reduce((s, x) => s + x.v, 0);
      const mean = (sum + base * 2) / (h.length + 2);
      const lastN = h.slice(-5).map(x => x.v);
      return { line: Math.max(.5, half(mean)), avg: h.length ? sum / h.length : null, games: h.length, last: lastN };
    },
    hitRate(pid, key, line, beforeGame) {
      const h = history(pid, defOf(key), beforeGame).slice(-8);
      if (!h.length) return null;
      const over = h.filter(x => x.v > line).length;
      return { over, n: h.length };
    },
    // List the available props for a game.
    forGame(g) {
      const list = [];
      for (const tid of [g.home, g.away]) {
        const ros = A.store.roster(tid);
        for (const def of DEFS) {
          const cands = ros.filter(p => def.pos.includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, def.n);
          cands.forEach(p => {
            const L = this.lineFor(p.id, def.key, g);
            list.push({ id: `${g.id}:${p.id}:${def.key}`, gameId: g.id, kind: 'player', pid: p.id, tid, key: def.key, label: def.label, line: L.line, avg: L.avg, games: L.games, last: L.last });
          });
        }
      }
      // game total + team totals
      const pts = t => { const gs = S().games.filter(x => x.played && (x.home === t || x.away === t)).slice(-6); return gs.length ? gs.reduce((s, x) => s + A.teamScore(x, t), 0) / gs.length : 21; };
      list.push({ id: `${g.id}:T:total`, gameId: g.id, kind: 'total', key: 'total', label: 'Game total points', line: half(pts(g.home) + pts(g.away)), avg: null, games: 0, last: [] });
      for (const tid of [g.home, g.away]) list.push({ id: `${g.id}:${tid}:team`, gameId: g.id, kind: 'team', tid, key: 'team', label: `${A.tNick(tid)} points`, line: half(pts(tid)), avg: null, games: 0, last: [] });
      return list;
    },
    pickFor(propId) { return S().picks.find(p => p.id === propId); },
    pick(prop, side, line) {
      const ex = this.pickFor(prop.id);
      if (ex && ex.result) return;                 // already graded
      if (ex && ex.side === side && (line == null || line === ex.line)) { S().picks = S().picks.filter(p => p !== ex); A.store.save(); return; }
      const g = A.store.game(prop.gameId), ln = line != null ? line : prop.line;
      const ch = A.odds ? A.odds.prop(Object.assign({}, prop, { line: ln }), g) : null;
      const rec = { chance: ch ? ch[side] : null, id: prop.id, gameId: prop.gameId, season: A.store.game(prop.gameId).season, kind: prop.kind, pid: prop.pid || null, tid: prop.tid || null, key: prop.key, label: prop.label, line: line != null ? line : prop.line, side, result: null, actual: null, at: Date.now() };
      if (ex) Object.assign(ex, rec); else S().picks.push(rec);
      A.store.save();
    },
    grade(g) {
      S().picks.filter(p => p.gameId === g.id).forEach(p => {
        let actual;
        if (p.kind === 'total') actual = n0(g.hs) + n0(g.as);
        else if (p.kind === 'team') actual = A.teamScore(g, p.tid);
        else { const ln = g.box && g.box[p.pid]; actual = ln ? defOf(p.key).get(ln) : 0; }
        p.actual = actual;
        p.result = (p.side === 'over') === (actual > p.line) ? 'W' : 'L';
      });
    },
    summary() {
      const gr = S().picks.filter(p => p.result).sort((a, b) => a.at - b.at);
      const w = gr.filter(p => p.result === 'W').length;
      let cur = 0, best = 0, run = 0;
      gr.forEach(p => { if (p.result === 'W') { run++; best = Math.max(best, run); } else run = 0; }); cur = run;
      const by = {};
      gr.forEach(p => { const k = p.label.replace(/^.* points$/, 'Team points'); (by[k] = by[k] || { w: 0, l: 0 })[p.result === 'W' ? 'w' : 'l']++; });
      const sides = { over: { w: 0, l: 0 }, under: { w: 0, l: 0 } };
      gr.forEach(p => sides[p.side][p.result === 'W' ? 'w' : 'l']++);
      const withCh = gr.filter(p => p.chance != null);
      const expected = withCh.reduce((s, p) => s + p.chance, 0);
      return { expected, expN: withCh.length, expW: withCh.filter(p => p.result === 'W').length, n: gr.length, w, l: gr.length - w, cur, best, by, sides, recent: gr.slice(-10).reverse(), pending: S().picks.filter(p => !p.result) };
    },
  };
  A.onGameSaved(g => A.props.grade(g));
})(globalThis);
