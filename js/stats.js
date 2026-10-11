// The stat engine. Everything is worked out from the saved box scores, so nothing can get out of sync.
(function (G) {
  const A = G.ADFL;

  // Column groups: used for the box-score form, tables and leaderboards. [key, header, step]
  A.GROUPS = [
    { id: 'pass', title: 'Passing', pos: ['QB'], cols: [['pc', 'CMP'], ['pa', 'ATT'], ['py', 'YDS'], ['ptd', 'TD'], ['pint', 'INT'], ['psk', 'SCK'], ['plng', 'LNG']] },
    { id: 'rush', title: 'Rushing', pos: ['RB'], cols: [['ra', 'ATT'], ['ry', 'YDS'], ['rtd', 'TD'], ['rlng', 'LNG'], ['fum', 'FUM']] },
    { id: 'rec', title: 'Receiving', pos: ['WR', 'TE'], cols: [['tg', 'TGT'], ['rec', 'REC'], ['recy', 'YDS'], ['rectd', 'TD'], ['reclng', 'LNG'], ['drp', 'DRP']] },
    { id: 'def', title: 'Defense', pos: ['DL', 'LB', 'CB', 'S'], cols: [['tkl', 'TKL'], ['tfl', 'TFL'], ['sck', 'SCK', .5], ['dint', 'INT'], ['pd', 'PD'], ['ff', 'FF'], ['fr', 'FR'], ['dtd', 'TD']] },
    { id: 'kick', title: 'Kicking', pos: ['K'], cols: [['fgm', 'FGM'], ['fga', 'FGA'], ['fglng', 'LNG'], ['xpm', 'XPM'], ['xpa', 'XPA']] },
    { id: 'punt', title: 'Punting', pos: ['P'], cols: [['pn', 'PUNTS'], ['pny', 'YDS'], ['pn20', 'IN20'], ['pnlng', 'LNG']] },
    { id: 'ret', title: 'Returns', pos: [], cols: [['kr', 'KR'], ['kry', 'KR YDS'], ['krtd', 'KR TD'], ['pr', 'PR'], ['pry', 'PR YDS'], ['prtd', 'PR TD']] },
  ];
  A.MAXKEYS = new Set(['plng', 'rlng', 'reclng', 'fglng', 'pnlng']);
  A.SUMKEYS = [];
  A.GROUPS.forEach(g => g.cols.forEach(c => { if (!A.MAXKEYS.has(c[0])) A.SUMKEYS.push(c[0]); }));
  A.ALLKEYS = A.GROUPS.flatMap(g => g.cols.map(c => c[0]));
  A.KEYNAME = {
    pc: 'Completions', pa: 'Pass attempts', py: 'Passing yards', ptd: 'Passing TDs', pint: 'Interceptions thrown', psk: 'Sacks taken', plng: 'Longest pass',
    ra: 'Rush attempts', ry: 'Rushing yards', rtd: 'Rushing TDs', rlng: 'Longest rush', fum: 'Fumbles lost',
    tg: 'Targets', rec: 'Receptions', recy: 'Receiving yards', rectd: 'Receiving TDs', reclng: 'Longest catch', drp: 'Drops',
    tkl: 'Tackles', tfl: 'Tackles for loss', sck: 'Sacks', dint: 'Interceptions', pd: 'Passes defended', ff: 'Forced fumbles', fr: 'Fumble recoveries', dtd: 'Defensive TDs',
    fgm: 'Field goals made', fga: 'Field goals attempted', fglng: 'Longest FG', xpm: 'XPs made', xpa: 'XPs attempted',
    pn: 'Punts', pny: 'Punt yards', pn20: 'Punts inside the 20', pnlng: 'Longest punt',
    kr: 'Kick returns', kry: 'KR yards', krtd: 'KR TDs', pr: 'Punt returns', pry: 'PR yards', prtd: 'PR TDs',
  };

  const n0 = v => (v == null || v === '' || isNaN(+v)) ? 0 : +v;
  A.num = n0;
  A.div0 = (a, b) => b ? a / b : 0;

  // ---------- formatting ----------
  A.f1 = v => (isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '-');
  A.f2 = v => (isFinite(v) ? v.toFixed(2) : '-');
  A.pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
  A.rec = (w, l, t) => `${w}-${l}${t ? '-' + t : ''}`;
  A.winp = (w, l, t) => { const g = w + l + t; return g ? ((w + t / 2) / g) : 0; };
  A.fpct = v => g3(v);
  function g3(v) { return v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, ''); }
  A.mmss = s => { s = Math.round(n0(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  A.parseTop = v => { if (v == null || v === '') return 0; if (typeof v === 'number') return v; const m = String(v).split(':'); return m.length > 1 ? (+m[0] || 0) * 60 + (+m[1] || 0) : (+m[0] || 0) * 60; };

  // ---------- games ----------
  A.isPlayed = g => g.played;
  A.finalScores = g => ({ hs: n0(g.hs), as: n0(g.as) });
  A.winnerOf = g => g.hs > g.as ? g.home : g.as > g.hs ? g.away : null;
  A.sumQ = (arr, upTo) => (arr || []).slice(0, upTo == null ? 5 : upTo).reduce((s, v) => s + n0(v), 0);
  A.gameLabel = g => `${A.weekName(g.week)}, Season ${g.season}`;

  // ---------- player totals ----------
  // lines: g.box[pid] = { t:'MET', pc:12, ... } only filled keys. GP = games where the player has a line.
  A.aggPlayers = function (games) {
    const m = new Map();
    for (const g of games) {
      if (!g.played) continue;
      for (const pid in g.box) {
        const ln = g.box[pid];
        let s = m.get(pid);
        if (!s) { s = { pid, gp: 0, teams: new Set() }; A.ALLKEYS.forEach(k => s[k] = 0); m.set(pid, s); }
        s.gp++; s.teams.add(ln.t);
        for (const k of A.SUMKEYS) s[k] += n0(ln[k]);
        for (const k of A.MAXKEYS) s[k] = Math.max(s[k], n0(ln[k]));
      }
    }
    m.forEach(A.derive);
    return m;
  };

  A.passerRating = function (c, a, y, td, i) {
    if (!a) return 0;
    const cl = v => Math.max(0, Math.min(2.375, v));
    return (cl((c / a - .3) * 5) + cl((y / a - 3) * .25) + cl(td / a * 20) + cl(2.375 - i / a * 25)) / 6 * 100;
  };

  A.derive = function (s) {
    s.cmpPct = A.div0(s.pc, s.pa) * 100;
    s.ypa = A.div0(s.py, s.pa);
    s.aya = A.div0(s.py + 20 * s.ptd - 45 * s.pint, s.pa);
    s.rating = A.passerRating(s.pc, s.pa, s.py, s.ptd, s.pint);
    s.ypc = A.div0(s.ry, s.ra);
    s.ypr = A.div0(s.recy, s.rec);
    s.ypt = A.div0(s.recy, s.tg);
    s.catchPct = A.div0(s.rec, s.tg) * 100;
    s.fgPct = A.div0(s.fgm, s.fga) * 100;
    s.xpPct = A.div0(s.xpm, s.xpa) * 100;
    s.ypp = A.div0(s.pny, s.pn);
    s.scrim = s.ry + s.recy;
    s.allpurp = s.ry + s.recy + s.kry + s.pry;
    s.tds = s.rtd + s.rectd + s.krtd + s.prtd + s.dtd;
    s.tot = s.tds + 0; // skill TDs (passing TDs counted separately)
    s.pts = s.tds * 6 + s.fgm * 3 + s.xpm;
    s.pyds = s.py;
    s.ypg = A.div0(s.py, s.gp);
    s.rypg = A.div0(s.ry, s.gp);
    s.recypg = A.div0(s.recy, s.gp);
    s.tklpg = A.div0(s.tkl, s.gp);
    s.takeaways = s.dint + s.fr;
    s.turnovers = s.pint + s.fum;
    s.impact = A.impact(s);
    s.ipg = A.div0(s.impact, s.gp);
    return s;
  };

  // One number that says "how big was this performance" - used for suggested Players of the Game and All-League teams.
  A.impact = function (s) {
    const g = k => n0(s[k]);
    return g('py') / 25 + g('ptd') * 4 - g('pint') * 2 - g('psk') * .5 +
      g('ry') / 10 + g('rtd') * 6 - g('fum') * 2 +
      g('recy') / 10 + g('rec') * .5 + g('rectd') * 6 +
      g('tkl') * 1 + g('tfl') * 1 + g('sck') * 4 + g('dint') * 5 + g('pd') * 1.5 + g('ff') * 3 + g('fr') * 2 + g('dtd') * 6 +
      g('fgm') * 3 + g('xpm') * 1 - (g('fga') - g('fgm')) * 1 +
      g('pn20') * 1 + g('kry') / 20 + g('pry') / 15 + g('krtd') * 6 + g('prtd') * 6;
  };

  // ---------- team totals ----------
  const sideKey = (g, tid) => g.home === tid ? 'home' : 'away';
  A.oppOf = (g, tid) => g.home === tid ? g.away : g.home;
  A.teamScore = (g, tid) => g.home === tid ? n0(g.hs) : n0(g.as);
  A.oppScore = (g, tid) => g.home === tid ? n0(g.as) : n0(g.hs);

  // Team lines out of a game: sums of the box lines for that team.
  A.teamLine = function (g, tid) {
    const o = {}; A.ALLKEYS.forEach(k => o[k] = 0);
    for (const pid in g.box) {
      const ln = g.box[pid]; if (ln.t !== tid) continue;
      for (const k of A.SUMKEYS) o[k] += n0(ln[k]);
      for (const k of A.MAXKEYS) o[k] = Math.max(o[k], n0(ln[k]));
    }
    const ts = (g.team && g.team[sideKey(g, tid)]) || {};
    o.passY = o.py; o.rushY = o.ry; o.totY = o.py + o.ry;
    o.giveaways = o.pint + o.fum;
    o.fd = n0(ts.fd); o.thM = n0(ts.thM); o.thA = n0(ts.thA); o.foM = n0(ts.foM); o.foA = n0(ts.foA);
    o.rzM = n0(ts.rzM); o.rzA = n0(ts.rzA); o.pen = n0(ts.pen); o.penY = n0(ts.penY); o.top = A.parseTop(ts.top);
    o.tp = n0(ts.tp); o.saf = n0(ts.saf);
    o.tds = o.rtd + o.rectd + o.krtd + o.prtd + o.dtd;
    o.expPts = o.tds * 6 + o.xpm + o.fgm * 3 + o.tp * 2 + o.saf * 2;
    return o;
  };

  A.halfLead = function (g, tid) { // points ahead after 2 quarters (negative = behind). null if no quarter scores saved.
    if (!g.q || !g.q.home || g.q.home.every(v => v == null || v === '')) return null;
    const mine = A.sumQ(g.q[sideKey(g, tid)], 2), theirs = A.sumQ(g.q[g.home === tid ? 'away' : 'home'], 2);
    return mine - theirs;
  };
  A.thirdLead = function (g, tid) {
    if (!g.q || !g.q.home || g.q.home.every(v => v == null || v === '')) return null;
    return A.sumQ(g.q[sideKey(g, tid)], 3) - A.sumQ(g.q[g.home === tid ? 'away' : 'home'], 3);
  };

  const newTeamAgg = tid => ({
    tid, gp: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, hw: 0, hl: 0, ht: 0, aw: 0, al: 0, at: 0, dw: 0, dl: 0, dt: 0, cw: 0, cl: 0, ct: 0,
    results: [], off: {}, def: {},
  });

  // Totals for every team across the given games.
  A.aggTeams = function (games) {
    const m = {}; A.TEAMS.forEach(t => m[t.id] = newTeamAgg(t.id));
    const sorted = games.filter(g => g.played).slice().sort((a, b) => a.season - b.season || a.week - b.week);
    for (const g of sorted) {
      for (const tid of [g.home, g.away]) {
        const T = m[tid]; if (!T) continue;
        const o = A.oppOf(g, tid), me = A.teamScore(g, tid), op = A.oppScore(g, tid);
        const res = me > op ? 'W' : me < op ? 'L' : 'T';
        T.gp++; T.pf += me; T.pa += op; T.results.push({ g, res, me, op, opp: o });
        const home = g.home === tid;
        const k = res === 'W' ? 'w' : res === 'L' ? 'l' : 't';
        T[k]++;
        T[(home ? 'h' : 'a') + k]++;
        if (A.team(o) && A.team(o).div === A.team(tid).div) T['d' + k]++;
        if (A.team(o) && A.team(o).conf === A.team(tid).conf) T['c' + k]++;
        const mine = A.teamLine(g, tid), theirs = A.teamLine(g, o);
        for (const key of Object.keys(mine)) {
          if (A.MAXKEYS.has(key)) T.off[key] = Math.max(T.off[key] || 0, mine[key]);
          else T.off[key] = (T.off[key] || 0) + mine[key];
        }
        for (const key of Object.keys(theirs)) {
          if (A.MAXKEYS.has(key)) continue;
          T.def[key] = (T.def[key] || 0) + theirs[key];
        }
      }
    }
    Object.values(m).forEach(T => {
      T.diff = T.pf - T.pa; T.pct = A.winp(T.w, T.l, T.t);
      // streak
      const r = T.results; let s = 0, kind = null;
      for (let i = r.length - 1; i >= 0; i--) { if (kind == null) kind = r[i].res; if (r[i].res === kind) s++; else break; }
      T.streak = kind ? { kind, n: s } : null;
      const l5 = r.slice(-5); T.last5 = { w: l5.filter(x => x.res === 'W').length, l: l5.filter(x => x.res === 'L').length, t: l5.filter(x => x.res === 'T').length };
      T.takeaways = (T.def.giveaways || 0);
      T.giveaways = (T.off.giveaways || 0);
    });
    return m;
  };

  // ---------- standings ----------
  // Rank a group of teams: win %, then head-to-head among the tied teams, then point difference, then points scored.
  A.rankTeams = function (ids, games, aggs) {
    aggs = aggs || A.aggTeams(games);
    const arr = ids.slice().sort((a, b) => aggs[b].pct - aggs[a].pct);
    const out = [];
    for (let i = 0; i < arr.length;) {
      let j = i; while (j < arr.length && aggs[arr[j]].pct === aggs[arr[i]].pct) j++;
      const grp = arr.slice(i, j);
      if (grp.length > 1) {
        const hh = {}; grp.forEach(t => hh[t] = { w: 0, g: 0 });
        games.forEach(g => { if (g.played && grp.includes(g.home) && grp.includes(g.away)) { const win = A.winnerOf(g); [g.home, g.away].forEach(t => { hh[t].g++; if (win === t) hh[t].w++; else if (!win) hh[t].w += .5; }); } });
        grp.sort((a, b) => (A.div0(hh[b].w, hh[b].g) - A.div0(hh[a].w, hh[a].g)) || (aggs[b].diff - aggs[a].diff) || (aggs[b].pf - aggs[a].pf) || (a < b ? -1 : 1));
      }
      out.push(...grp); i = j;
    }
    return out;
  };

  A.standings = function (games) {
    const aggs = A.aggTeams(games);
    const divs = A.DIVS.map(d => ({ div: d, teams: A.rankTeams(A.divTeams(d.id), games, aggs) }));
    const confs = A.CONFS.map(c => {
      const winners = A.rankTeams(divs.filter(d => d.div.conf === c.id).map(d => d.teams[0]), games, aggs);
      const rest = A.rankTeams(A.confTeams(c.id).filter(t => !winners.includes(t)), games, aggs);
      const order = winners.concat(rest);
      return { conf: c, order, winners };
    });
    return { aggs, divs, confs };
  };

  // ---------- head to head ----------
  A.between = (games, a, b) => games.filter(g => g.played && ((g.home === a && g.away === b) || (g.home === b && g.away === a)))
    .sort((x, y) => x.season - y.season || x.week - y.week);

  A.h2h = function (games, a, b) {
    const list = A.between(games, a, b);
    const o = { a, b, list, n: list.length, aW: 0, bW: 0, t: 0, aPF: 0, bPF: 0, aHome: { w: 0, l: 0, t: 0 }, bHome: { w: 0, l: 0, t: 0 }, playoff: { n: 0, aW: 0, bW: 0 } };
    for (const g of list) {
      const as = A.teamScore(g, a), bs = A.teamScore(g, b);
      o.aPF += as; o.bPF += bs;
      const w = as > bs ? 'a' : bs > as ? 'b' : 't';
      if (w === 'a') o.aW++; else if (w === 'b') o.bW++; else o.t++;
      const hs = g.home === a ? o.aHome : o.bHome;
      if (as === bs) hs.t++; else if ((g.home === a) === (as > bs)) hs.w++; else hs.l++;
      if (g.type === 'playoff') { o.playoff.n++; if (w === 'a') o.playoff.aW++; else if (w === 'b') o.playoff.bW++; }
    }
    o.last = list[list.length - 1] || null;
    // current streak (who has won the most recent meetings in a row)
    let st = null, sn = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const w = A.winnerOf(list[i]); if (!w) break;
      if (st == null) st = w; if (w === st) sn++; else break;
    }
    o.streak = st ? { team: st, n: sn } : null;
    let big = null;
    list.forEach(g => { const m = Math.abs(n0(g.hs) - n0(g.as)); if (!big || m > big.m) big = { g, m, w: A.winnerOf(g) }; });
    o.biggest = big && big.m > 0 ? big : null;
    o.avgA = A.div0(o.aPF, o.n); o.avgB = A.div0(o.bPF, o.n);
    o.avgTotal = o.avgA + o.avgB;
    o.oneScore = list.filter(g => Math.abs(n0(g.hs) - n0(g.as)) <= 8).length;
    return o;
  };

  // ---------- win / loss splits ("when ...") ----------
  A.situations = function (games, tid) {
    const mine = games.filter(g => g.played && (g.home === tid || g.away === tid)).sort((x, y) => x.season - y.season || x.week - y.week);
    const defs = [
      ['Leading at the half', g => { const h = A.halfLead(g, tid); return h == null ? null : h > 0; }],
      ['Trailing at the half', g => { const h = A.halfLead(g, tid); return h == null ? null : h < 0; }],
      ['Tied at the half', g => { const h = A.halfLead(g, tid); return h == null ? null : h === 0; }],
      ['Leading after 3 quarters', g => { const h = A.thirdLead(g, tid); return h == null ? null : h > 0; }],
      ['Trailing after 3 quarters', g => { const h = A.thirdLead(g, tid); return h == null ? null : h < 0; }],
      ['Scoring first', g => g.firstScore ? (g.firstScore === sideKey(g, tid)) : null],
      ['Opponent scores first', g => g.firstScore ? (g.firstScore !== sideKey(g, tid)) : null],
      ['Winning the turnover battle', g => { const m = A.teamLine(g, tid), o = A.teamLine(g, A.oppOf(g, tid)); return m.giveaways < o.giveaways; }],
      ['Losing the turnover battle', g => { const m = A.teamLine(g, tid), o = A.teamLine(g, A.oppOf(g, tid)); return m.giveaways > o.giveaways; }],
      ['Zero turnovers', g => A.teamLine(g, tid).giveaways === 0],
      ['One-score games (8 or less)', g => Math.abs(n0(g.hs) - n0(g.as)) <= 8],
      ['Overtime games', g => !!g.ot],
      ['Scoring 24 or more', g => A.teamScore(g, tid) >= 24],
      ['Holding opponent under 17', g => A.oppScore(g, tid) < 17],
      ['Rushing for 100+ yards', g => A.teamLine(g, tid).ry >= 100],
      ['Passing for 250+ yards', g => A.teamLine(g, tid).py >= 250],
      ['At home', g => g.home === tid],
      ['On the road', g => g.away === tid],
      ['Vs division rivals', g => A.team(A.oppOf(g, tid)).div === A.team(tid).div],
      ['Vs other conference', g => A.team(A.oppOf(g, tid)).conf !== A.team(tid).conf],
      ['In the playoffs', g => g.type === 'playoff'],
    ];
    const out = [];
    for (const [label, f] of defs) {
      let w = 0, l = 0, t = 0;
      for (const g of mine) {
        const hit = f(g); if (!hit) continue;
        const me = A.teamScore(g, tid), op = A.oppScore(g, tid);
        if (me > op) w++; else if (me < op) l++; else t++;
      }
      if (w + l + t) out.push({ label, w, l, t, n: w + l + t });
    }
    return out;
  };

  // longest win streak etc. for team record book
  A.longestStreak = function (results, kind) {
    let best = 0, cur = 0;
    for (const r of results) { if (r.res === kind) { cur++; best = Math.max(best, cur); } else cur = 0; }
    return best;
  };

  // Player's per-game line list (newest last)
  A.playerLog = function (games, pid) {
    return games.filter(g => g.played && g.box && g.box[pid]).sort((a, b) => a.season - b.season || a.week - b.week)
      .map(g => ({ g, ln: g.box[pid], opp: A.oppOf(g, g.box[pid].t), res: A.winnerOf(g) === g.box[pid].t ? 'W' : A.winnerOf(g) ? 'L' : 'T', me: A.teamScore(g, g.box[pid].t), op: A.oppScore(g, g.box[pid].t) }));
  };
})(globalThis);
