// Awards: you give them out (with the stats suggesting who deserves it), plus automatic stat-title winners and an All-ADFL team.
(function (G) {
  const A = G.ADFL;
  const S = () => A.store.state;

  A.WEEKLY = [
    { type: 'POWO', name: 'Offensive Player of the Week' },
    { type: 'POWD', name: 'Defensive Player of the Week' },
    { type: 'POWT', name: 'Special Teams Player of the Week' },
  ];
  A.SEASONAL = [
    { type: 'MVP', name: 'League MVP', pick: 'player' },
    { type: 'OPOY', name: 'Offensive Player of the Year', pick: 'player' },
    { type: 'DPOY', name: 'Defensive Player of the Year', pick: 'player' },
    { type: 'ROY', name: 'Rookie of the Year', pick: 'player' },
    { type: 'CPOY', name: 'Comeback Player of the Year', pick: 'player' },
    { type: 'CHAMPMVP', name: A.LEAGUE.champGame + ' MVP', pick: 'player' },
    { type: 'COY', name: 'Coach of the Year', pick: 'team' },
  ];
  A.awardName = type => (A.WEEKLY.concat(A.SEASONAL).find(a => a.type === type) || {}).name || type;

  const OFF = ['py', 'ptd', 'pint', 'psk', 'ry', 'rtd', 'fum', 'recy', 'rec', 'rectd'];
  const DEF = ['tkl', 'tfl', 'sck', 'dint', 'pd', 'ff', 'fr', 'dtd'];
  const ST = ['fgm', 'fga', 'xpm', 'pn20', 'kry', 'pry', 'krtd', 'prtd'];
  const mask = (s, keys) => { const o = {}; keys.forEach(k => o[k] = s[k] || 0); return o; };
  A.impactParts = s => ({ off: A.impact(mask(s, OFF)), def: A.impact(mask(s, DEF)), st: A.impact(mask(s, ST)) });

  // Who deserves it? Returns sorted [{pid, score, line}]
  A.suggest = function (type, season, week) {
    const games = S().games.filter(g => g.played && g.season === season && (type.startsWith('POW') ? g.week === week : true) && (type === 'CHAMPMVP' ? g.round === 'FINAL' : true));
    const ag = A.aggPlayers(games);
    const rows = [...ag.values()].map(s => { const p = S().players[s.pid]; const parts = A.impactParts(s); return { pid: s.pid, p, s, parts }; }).filter(r => r.p);
    const pick = {
      POWO: r => r.parts.off, POWD: r => r.parts.def, POWT: r => r.parts.st,
      MVP: r => r.s.impact, OPOY: r => r.parts.off, DPOY: r => r.parts.def,
      ROY: r => r.p.rookie ? r.s.impact : -1, CPOY: r => r.s.impact, CHAMPMVP: r => r.s.impact,
    }[type];
    if (!pick) return [];
    return rows.map(r => ({ pid: r.pid, score: pick(r), s: r.s })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  };

  A.suggestCoach = function (season) {
    const reg = S().games.filter(g => g.season === season && g.type === 'reg');
    const ag = A.aggTeams(reg);
    return Object.values(ag).filter(T => T.gp).sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, 4).map(T => ({ tid: T.tid, T }));
  };

  // Stat title winners for a season (or all-time)
  A.TITLES = [
    ['py', 'Passing yards'], ['ptd', 'Passing TDs'], ['ry', 'Rushing yards'], ['rtd', 'Rushing TDs'], ['recy', 'Receiving yards'], ['rec', 'Receptions'], ['rectd', 'Receiving TDs'],
    ['sck', 'Sacks'], ['dint', 'Interceptions'], ['tkl', 'Tackles'], ['fgm', 'Field goals'], ['pts', 'Points scored'], ['rating', 'Passer rating'],
  ];
  A.titleWinners = function (season) {
    const games = S().games.filter(g => g.played && g.season === season && g.type === 'reg');
    const ag = A.aggPlayers(games);
    const all = [...ag.values()];
    return A.TITLES.map(([k, l]) => {
      let pool = all;
      if (k === 'rating') pool = all.filter(s => s.pa >= 40);
      const best = pool.filter(s => s[k] > 0).sort((a, b) => b[k] - a[k])[0];
      return best ? { key: k, label: l, pid: best.pid, v: best[k], s: best } : null;
    }).filter(Boolean);
  };

  // All-ADFL: best by impact at each position slot.
  const SLOTS = [['QB', 1], ['RB', 2], ['WR', 3], ['TE', 1], ['DL', 3], ['LB', 2], ['CB', 2], ['S', 2], ['K', 1], ['P', 1]];
  A.allLeague = function (season) {
    const games = S().games.filter(g => g.played && g.season === season && g.type === 'reg');
    const ag = A.aggPlayers(games);
    const out = [];
    SLOTS.forEach(([pos, n]) => {
      const r = [...ag.values()].filter(s => S().players[s.pid] && S().players[s.pid].pos === pos && s.gp >= 3)
        .sort((a, b) => b.ipg - a.ipg).slice(0, n);
      r.forEach(s => out.push({ pos, pid: s.pid, s }));
    });
    return out;
  };

  // Everything one player has won
  A.playerAwards = pid => S().awards.filter(a => a.pid === pid);
})(globalThis);
