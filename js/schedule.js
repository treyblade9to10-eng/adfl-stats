// Builds a 10-week schedule: every team plays every week, no byes, 6 games a week.
// Each team plays 10: division rivals twice (home + away), the other division in its conference once,
// and one division from the other conference once (that one flips every season).
(function (G) {
  const A = G.ADFL;

  function requiredGames(season) {
    const pairs = []; // [a, b, kind]
    const ids = A.TEAMS.map(t => t.id);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = A.team(ids[i]), b = A.team(ids[j]);
      if (a.div === b.div) { pairs.push([a.id, b.id, 'div']); pairs.push([a.id, b.id, 'div']); }
      else if (a.conf === b.conf) pairs.push([a.id, b.id, 'conf']);
      else if (A.crossDiv(season, a.div) === b.div) pairs.push([a.id, b.id, 'cross']);
    }
    return pairs;
  }

  // Find one perfect matching in the leftover multigraph (randomised backtracking).
  function weekMatching(edges, prev, r) {
    const ids = A.TEAMS.map(t => t.id);
    const adj = {}; ids.forEach(i => adj[i] = []);
    edges.forEach((e, idx) => { adj[e[0]].push([e[1], idx]); adj[e[1]].push([e[0], idx]); });
    const used = new Set(), chosen = [];
    let steps = 0;
    function go() {
      if (++steps > 4000) return false;
      // team with the fewest options goes first
      let best = null, bestOpts = null;
      for (const t of ids) {
        if (used.has(t)) continue;
        const opts = adj[t].filter(([o, idx]) => !used.has(o) && !(prev && prev.has(t < o ? t + o : o + t)));
        if (!best || opts.length < bestOpts.length) { best = t; bestOpts = opts; }
        if (!opts.length) return false;
      }
      if (!best) return true;
      // try each distinct opponent once (a doubled pair only needs one try)
      const seen = new Set();
      for (const [o, idx] of A.shuffle(bestOpts.slice(), r)) {
        if (seen.has(o)) continue; seen.add(o);
        used.add(best); used.add(o); chosen.push(idx);
        if (go()) return true;
        used.delete(best); used.delete(o); chosen.pop();
      }
      return false;
    }
    return go() ? chosen.slice() : null;
  }

  // Give single games a home team so everyone ends up with the same number of home and away games (Euler walk).
  function orient(singles) {
    const adj = {};
    singles.forEach((e, i) => { (adj[e[0]] = adj[e[0]] || []).push([e[1], i]); (adj[e[1]] = adj[e[1]] || []).push([e[0], i]); });
    const done = new Array(singles.length).fill(false), home = new Array(singles.length);
    for (const start of Object.keys(adj)) {
      const stack = [start], path = [];
      // Hierholzer circuit, orienting each edge in the direction we walk it
      while (stack.length) {
        const v = stack[stack.length - 1];
        const next = adj[v].find(([o, i]) => !done[i]);
        if (next) { done[next[1]] = true; home[next[1]] = v; stack.push(next[0]); }
        else path.push(stack.pop());
      }
    }
    return singles.map((e, i) => home[i] === e[0] ? { home: e[0], away: e[1] } : { home: e[1], away: e[0] });
  }

  A.makeSchedule = function (season) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const r = A.rng(season * 7919 + attempt * 104729 + 17);
      let edges = requiredGames(season);
      const weeks = []; let prev = null, ok = true;
      for (let w = 1; w <= A.LEAGUE.regWeeks; w++) {
        const pick = weekMatching(edges, prev, r);
        if (!pick) { ok = false; break; }
        weeks.push(pick.map(i => edges[i]));
        prev = new Set(pick.map(i => { const e = edges[i]; return e[0] < e[1] ? e[0] + e[1] : e[1] + e[0]; }));
        const drop = new Set(pick);
        edges = edges.filter((e, i) => !drop.has(i));
      }
      if (!ok || edges.length) continue;
      // home / away
      const singles = [], singleRef = [];
      const divSeen = {};
      const out = weeks.map(() => []);
      weeks.forEach((wk, wi) => wk.forEach(e => {
        if (e[2] === 'div') {
          const key = e[0] + e[1];
          if (!divSeen[key]) { const flip = r() < .5; divSeen[key] = flip ? [e[1], e[0]] : [e[0], e[1]]; out[wi].push({ home: divSeen[key][0], away: divSeen[key][1], kind: 'div' }); }
          else out[wi].push({ home: divSeen[key][1], away: divSeen[key][0], kind: 'div' });
        } else { singles.push(e); singleRef.push(wi); }
      }));
      orient(singles).forEach((g, i) => out[singleRef[i]].push({ home: g.home, away: g.away, kind: singles[i][2] }));
      const games = [];
      out.forEach((wk, wi) => A.shuffle(wk, r).forEach(g => games.push({ week: wi + 1, home: g.home, away: g.away, kind: g.kind })));
      return games;
    }
    throw new Error('could not build a schedule');
  };
})(globalThis);
