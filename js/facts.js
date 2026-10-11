// "Announcer" facts: series history, streaks, situational records, player milestones, record book.
(function (G) {
  const A = G.ADFL;
  const n0 = A.num;
  const S = () => A.store.state;

  const wk = g => `${A.weekName(g.week)} of Season ${g.season}`;
  const sc = (g) => { const w = A.winnerOf(g); const hi = Math.max(g.hs, g.as), lo = Math.min(g.hs, g.as); return w ? `${A.tNick(w)} won ${hi}-${lo}` : `tied ${hi}-${lo}`; };

  // Rank of a team in the league for some number (1 = best). hi=true means bigger is better.
  function rankOf(aggs, tid, fn, hi) {
    const pool = A.TEAMS.filter(t => aggs[t.id].gp > 0);
    if (pool.length < 6 || aggs[tid].gp < 3) return 99;   // too early in the season to brag about a rank
    const vals = pool.map(t => ({ t: t.id, v: fn(aggs[t.id]) })).sort((a, b) => hi ? b.v - a.v : a.v - b.v);
    return vals.findIndex(x => x.t === tid) + 1;
  }

  A.broadcastFacts = function (games, a, b, season) {
    const out = { series: [], form: [], edges: [], players: [], splits: [] };
    const h = A.h2h(games, a, b);
    const A_ = A.tNick(a), B_ = A.tNick(b);

    // ---- series ----
    if (!h.n) out.series.push(`First ever meeting between the ${A_} and the ${B_}.`);
    else {
      const reg = h.n - h.playoff.n;
      out.series.push(`These two have met ${h.n} time${h.n > 1 ? 's' : ''}${h.playoff.n ? ` (${reg} regular season, ${h.playoff.n} playoff)` : ''}.`);
      if (h.aW === h.bW) out.series.push(`The all-time series is tied ${h.aW}-${h.bW}${h.t ? '-' + h.t : ''}.`);
      else { const lead = h.aW > h.bW ? a : b; out.series.push(`The ${A.tNick(lead)} lead the all-time series ${Math.max(h.aW, h.bW)}-${Math.min(h.aW, h.bW)}${h.t ? '-' + h.t : ''}.`); }
      if (h.streak && h.streak.n >= 2) out.series.push(`The ${A.tNick(h.streak.team)} have won the last ${h.streak.n} meetings.`);
      if (h.last) out.series.push(`Last meeting: ${wk(h.last)}, the ${sc(h.last)}.`);
      out.series.push(`Average score in the series: ${A_} ${A.f1(h.avgA)}, ${B_} ${A.f1(h.avgB)} (${A.f1(h.avgTotal)} combined).`);
      if (h.biggest) out.series.push(`Biggest win in the series: the ${A.tNick(h.biggest.w)} by ${h.biggest.m} (${Math.max(h.biggest.g.hs, h.biggest.g.as)}-${Math.min(h.biggest.g.hs, h.biggest.g.as)}, ${wk(h.biggest.g)}).`);
      if (h.n >= 2 && h.oneScore) out.series.push(`${h.oneScore} of ${h.n} meetings were decided by one score (8 or less).`);
      if (h.aHome.w + h.aHome.l + h.aHome.t) out.series.push(`When the ${A_} host the ${B_}: ${A.rec(h.aHome.w, h.aHome.l, h.aHome.t)}.`);
      if (h.bHome.w + h.bHome.l + h.bHome.t) out.series.push(`When the ${B_} host the ${A_}: ${A.rec(h.bHome.w, h.bHome.l, h.bHome.t)}.`);
      if (h.playoff.n) out.series.push(`Playoff meetings: ${A_} ${h.playoff.aW}, ${B_} ${h.playoff.bW}.`);
      const otg = h.list.filter(g => g.ot).length; if (otg) out.series.push(`${otg} of their meetings went to overtime.`);
    }

    // ---- form ----
    const cur = games.filter(g => g.season === season);
    const aggAll = A.aggTeams(games), aggSeason = A.aggTeams(cur);
    for (const t of [a, b]) {
      const T = aggSeason[t], N = A.tNick(t);
      if (T.gp) {
        out.form.push(`${N} are ${A.rec(T.w, T.l, T.t)} this season${T.streak && T.streak.n >= 2 ? `, ${T.streak.kind === 'W' ? 'winners of' : T.streak.kind === 'L' ? 'losers of' : 'tied in'} their last ${T.streak.n}` : ''}.`);
        const ra = rankOf(aggSeason, t, x => A.div0(x.pf, x.gp), true), rd = rankOf(aggSeason, t, x => A.div0(x.pa, x.gp), false);
        if (ra <= 3) out.form.push(`${N} have the #${ra} scoring offense in the league (${A.f1(A.div0(T.pf, T.gp))} per game).`);
        if (rd <= 3) out.form.push(`${N} have the #${rd} scoring defense in the league (${A.f1(A.div0(T.pa, T.gp))} allowed per game).`);
        if (T.gp >= 3 && T.off.rushY != null) {
          const rr = rankOf(aggSeason, t, x => A.div0(x.off.rushY, x.gp), true), rp = rankOf(aggSeason, t, x => A.div0(x.off.passY, x.gp), true);
          if (rr <= 2) out.form.push(`${N} lead the way on the ground: #${rr} in rushing (${A.f1(A.div0(T.off.rushY, T.gp))} yards a game).`);
          if (rp <= 2) out.form.push(`${N} are #${rp} in passing offense (${A.f1(A.div0(T.off.passY, T.gp))} yards a game).`);
        }
        const tk = rankOf(aggSeason, t, x => x.takeaways - x.giveaways, true);
        if (T.gp >= 3 && tk <= 2) out.form.push(`${N} are #${tk} in turnover margin (${(T.takeaways - T.giveaways) > 0 ? '+' : ''}${T.takeaways - T.giveaways}).`);
        const s3 = [...T.results].reverse(); let sc20 = 0; for (const r of s3) { if (r.me >= 20) sc20++; else break; } if (sc20 >= 3) out.form.push(`${N} have scored 20+ in ${sc20} straight games.`);
        let hold = 0; for (const r of s3) { if (r.op <= 17) hold++; else break; } if (hold >= 3) out.form.push(`${N} have held 3 straight opponents to 17 or fewer.`);
      } else if (aggAll[t].gp) {
        out.form.push(`${N} are ${A.rec(aggAll[t].w, aggAll[t].l, aggAll[t].t)} all-time in the ${A.LEAGUE.name}.`);
      }
    }

    // ---- matchup edges ----
    const ppg = (T, k) => A.div0(T.pf, T.gp), pag = T => A.div0(T.pa, T.gp);
    for (const [x, y] of [[a, b], [b, a]]) {
      const X = aggSeason[x], Y = aggSeason[y];
      if (X.gp && Y.gp) out.edges.push(`${A.tNick(x)} offense (${A.f1(ppg(X))} ppg) vs ${A.tNick(y)} defense (${A.f1(pag(Y))} allowed).`);
    }
    const dv = A.team(a).div === A.team(b).div; if (dv) out.edges.push('Division game: it counts twice as much for the division race.');
    const cross = A.team(a).conf !== A.team(b).conf; if (cross && !h.n) out.edges.push('Aisle vs Drive-Thru: stores against restaurants.');

    // ---- situational splits (ones worth saying out loud) ----
    for (const t of [a, b]) {
      const sit = A.situations(games, t).filter(s => s.n >= 3 && s.label !== 'At home' && s.label !== 'On the road');
      const striking = sit.filter(s => (s.l === 0 && s.w >= 3) || (s.w === 0 && s.l >= 3))
        .concat(sit.filter(s => !((s.l === 0 && s.w >= 3) || (s.w === 0 && s.l >= 3)) && s.n >= 4 && (A.winp(s.w, s.l, s.t) >= .8 || A.winp(s.w, s.l, s.t) <= .2)))
        .slice(0, 3);
      striking.forEach(s => out.splits.push(`${A.tNick(t)} are ${A.rec(s.w, s.l, s.t)} ${s.label.charAt(0).toLowerCase() + s.label.slice(1)}.`));
    }

    // ---- players against this opponent ----
    if (h.n) {
      const ag = A.aggPlayers(h.list);
      const top = (key, lab, min, side) => {
        const rows = [...ag.values()].filter(s => s[key] >= min).sort((x, y) => y[key] - x[key]);
        rows.slice(0, 1).forEach(s => { const p = S().players[s.pid]; if (p) out.players.push(`${p.name} (${A.tNick(s.teams.values().next().value)}) has ${s[key]} ${s[key] === 1 ? lab.replace(/s$/, '') : lab} in ${s.gp} game${s.gp > 1 ? 's' : ''} in this series.`); });
      };
      top('py', 'passing yards', 1); top('ry', 'rushing yards', 1); top('recy', 'receiving yards', 1);
      top('sck', 'sacks', 1); top('dint', 'interceptions', 1); top('tkl', 'tackles', 1); top('fgm', 'field goals', 1);
      // players with multi-TD games in series
      const mt = [];
      h.list.forEach(g => Object.entries(g.box || {}).forEach(([pid, ln]) => { const td = n0(ln.rtd) + n0(ln.rectd) + n0(ln.ptd); if (td >= 3) mt.push(`${A_NAME(pid)} scored ${td} touchdowns in ${wk(g)}.`); }));
      out.players.push(...mt.slice(0, 2));
    }
    return out;
  };
  const A_NAME = pid => A.store.pName(pid);

  // ---------- player milestones ----------
  A.playerFacts = function (log) {
    const hi = [], cnt = [], streaks = [];
    if (!log.length) return { hi, cnt, streaks };
    const best = (key, label) => {
      let b = null; log.forEach(r => { const v = n0(r.ln[key]); if (v > 0 && (!b || v > b.v)) b = { v, r }; });
      if (b) hi.push({ label, v: b.v, r: b.r });
    };
    [['py', 'Passing yards'], ['ptd', 'Passing TDs'], ['plng', 'Longest pass'], ['ry', 'Rushing yards'], ['rtd', 'Rushing TDs'], ['rlng', 'Longest rush'], ['recy', 'Receiving yards'],
      ['rec', 'Receptions'], ['rectd', 'Receiving TDs'], ['reclng', 'Longest catch'], ['tkl', 'Tackles'], ['sck', 'Sacks'], ['dint', 'Interceptions'], ['fgm', 'Field goals'], ['fglng', 'Longest FG'], ['pnlng', 'Longest punt']].forEach(([k, l]) => best(k, l));
    const c = (label, f) => { const n = log.filter(f).length; if (n) cnt.push({ label, n, of: log.length }); };
    c('300+ passing yards', r => n0(r.ln.py) >= 300); c('250+ passing yards', r => n0(r.ln.py) >= 250);
    c('3+ passing TDs', r => n0(r.ln.ptd) >= 3); c('Games with an INT thrown', r => n0(r.ln.pint) > 0);
    c('100+ rushing yards', r => n0(r.ln.ry) >= 100); c('100+ receiving yards', r => n0(r.ln.recy) >= 100); c('75+ receiving yards', r => n0(r.ln.recy) >= 75);
    c('Multi-TD games', r => ['ptd', 'rtd', 'rectd'].reduce((s, k) => s + n0(r.ln[k]), 0) >= 2);
    c('Scored a touchdown', r => ['rtd', 'rectd', 'krtd', 'prtd', 'dtd'].some(k => n0(r.ln[k]) > 0));
    c('10+ tackles', r => n0(r.ln.tkl) >= 10); c('Sacked the QB', r => n0(r.ln.sck) > 0); c('Picked off a pass', r => n0(r.ln.dint) > 0);
    c('Perfect on field goals', r => n0(r.ln.fga) > 0 && n0(r.ln.fgm) === n0(r.ln.fga));
    const streak = (label, f) => {
      let best = 0, cur = 0; log.forEach(r => { if (f(r)) { cur++; best = Math.max(best, cur); } else cur = 0; });
      if (best >= 2) streaks.push({ label, best, cur });
    };
    streak('Games with a touchdown', r => ['rtd', 'rectd', 'ptd', 'krtd', 'prtd', 'dtd'].some(k => n0(r.ln[k]) > 0));
    streak('Games with 75+ receiving yards', r => n0(r.ln.recy) >= 75);
    streak('Games with 100+ rushing yards', r => n0(r.ln.ry) >= 100);
    streak('Games with 250+ passing yards', r => n0(r.ln.py) >= 250);
    streak('Games with a sack', r => n0(r.ln.sck) > 0);
    streak('Games with 5+ tackles', r => n0(r.ln.tkl) >= 5);
    return { hi, cnt, streaks };
  };

  // ---------- record book ----------
  A.recordBook = function (games) {
    const played = games.filter(g => g.played);
    const out = { player: [], team: [], season: [] };
    const rows = [];
    played.forEach(g => Object.entries(g.box || {}).forEach(([pid, ln]) => rows.push({ pid, ln, g })));
    const top = (key, label, n = 3) => {
      const r = rows.filter(x => n0(x.ln[key]) > 0).sort((a, b) => n0(b.ln[key]) - n0(a.ln[key])).slice(0, n);
      if (r.length) out.player.push({ label, rows: r.map(x => ({ who: x.pid, team: x.ln.t, v: n0(x.ln[key]), g: x.g })) });
    };
    [['py', 'Most passing yards in a game'], ['ptd', 'Most passing TDs in a game'], ['ry', 'Most rushing yards in a game'], ['rtd', 'Most rushing TDs in a game'],
      ['recy', 'Most receiving yards in a game'], ['rec', 'Most catches in a game'], ['rectd', 'Most receiving TDs in a game'], ['tkl', 'Most tackles in a game'], ['sck', 'Most sacks in a game'],
      ['dint', 'Most interceptions in a game'], ['fgm', 'Most field goals in a game'], ['fglng', 'Longest field goal'], ['rlng', 'Longest run'], ['reclng', 'Longest catch'], ['plng', 'Longest pass'], ['pnlng', 'Longest punt']].forEach(([k, l]) => top(k, l));

    // team single game
    const trows = [];
    played.forEach(g => [g.home, g.away].forEach(t => trows.push({ t, g, me: A.teamScore(g, t), op: A.oppScore(g, t), L: A.teamLine(g, t) })));
    const tt = (label, valf, dir, n = 3, filter) => {
      let r = trows.filter(x => !filter || filter(x));
      r = r.sort((a, b) => dir * (valf(b) - valf(a))).slice(0, n);
      if (r.length) out.team.push({ label, rows: r.map(x => ({ team: x.t, v: valf(x), g: x.g, opp: A.oppOf(x.g, x.t) })) });
    };
    tt('Most points in a game', x => x.me, 1); tt('Biggest win', x => x.me - x.op, 1, 3, x => x.me > x.op);
    tt('Fewest points allowed in a win', x => x.op, -1, 3, x => x.me > x.op);
    tt('Most total yards in a game', x => x.L.totY, 1); tt('Most rushing yards in a game', x => x.L.ry, 1); tt('Most passing yards in a game', x => x.L.py, 1);
    tt('Most sacks in a game', x => x.L.sck, 1); tt('Most turnovers in a game', x => x.L.giveaways, 1);
    const tot = played.map(g => ({ g, v: n0(g.hs) + n0(g.as) })).sort((a, b) => b.v - a.v).slice(0, 3);
    if (tot.length) out.team.push({ label: 'Highest scoring game (combined)', rows: tot.map(x => ({ team: x.g.home, team2: x.g.away, v: x.v, g: x.g })) });

    // player seasons
    const seasons = [...new Set(played.map(g => g.season))];
    const srow = [];
    seasons.forEach(s => { A.aggPlayers(played.filter(g => g.season === s)).forEach((v, pid) => srow.push({ pid, s, v })); });
    const sbest = (key, label) => {
      const r = srow.filter(x => x.v[key] > 0).sort((a, b) => b.v[key] - a.v[key]).slice(0, 3);
      if (r.length) out.season.push({ label, rows: r.map(x => ({ who: x.pid, season: x.s, v: x.v[key], team: [...x.v.teams][0] })) });
    };
    [['py', 'Passing yards in a season'], ['ptd', 'Passing TDs in a season'], ['ry', 'Rushing yards in a season'], ['rtd', 'Rushing TDs in a season'], ['recy', 'Receiving yards in a season'],
      ['rec', 'Receptions in a season'], ['rectd', 'Receiving TDs in a season'], ['sck', 'Sacks in a season'], ['tkl', 'Tackles in a season'], ['dint', 'Interceptions in a season'], ['fgm', 'Field goals in a season']].forEach(([k, l]) => sbest(k, l));

    // team seasons
    const tsr = [];
    seasons.forEach(s => { const ag = A.aggTeams(played.filter(g => g.season === s && g.type === 'reg')); Object.values(ag).forEach(T => { if (T.gp) tsr.push({ T, s }); }); });
    const tsb = (label, f, dir, fmt) => {
      const r = tsr.sort((a, b) => dir * (f(b.T) - f(a.T))).slice(0, 3);
      if (r.length) out.season.push({ label, team: true, rows: r.map(x => ({ team: x.T.tid, season: x.s, v: fmt ? fmt(x.T) : f(x.T) })) });
    };
    tsb('Best regular-season record', T => T.pct * 1000 + T.diff / 1000, 1, T => A.rec(T.w, T.l, T.t));
    tsb('Most points in a season', T => T.pf, 1); tsb('Fewest points allowed in a season', T => T.pa, -1);
    tsb('Best point differential', T => T.diff, 1, T => (T.diff > 0 ? '+' : '') + T.diff);

    // streaks (all-time)
    const agAll = A.aggTeams(played);
    const ws = Object.values(agAll).map(T => ({ team: T.tid, v: A.longestStreak(T.results, 'W') })).sort((a, b) => b.v - a.v).slice(0, 3).filter(x => x.v > 1);
    if (ws.length) out.team.push({ label: 'Longest winning streak', rows: ws });
    return out;
  };
})(globalThis);
