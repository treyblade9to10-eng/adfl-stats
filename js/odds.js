// Odds: win chances for games and hit chances for over/under picks, worked out from past games.
// Everything only looks at games played BEFORE the one being predicted, so old predictions can be graded fairly.
(function (G) {
  const A = G.ADFL;
  const n0 = A.num;
  const S = () => A.store.state;

  // normal curve helper (chance a normal value is below z)
  function phi(z) {
    const t = 1 / (1 + .3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-z * z / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  const before = g => S().games.filter(x => x.played && x.id !== g.id && (x.season < g.season || (x.season === g.season && x.week < g.week)));
  const GAME_SD = 13;      // how much real football scores bounce around
  const HOME = 1;          // home field is worth about a point (you play every game yourself, so it's small)

  function rosterRating(tid) {
    const ros = A.store.roster(tid); if (!ros.length) return 70;
    return ros.reduce((s, p) => s + p.ovr, 0) / ros.length;
  }
  const leagueRating = () => A.TEAMS.reduce((s, t) => s + rosterRating(t.id), 0) / A.TEAMS.length;

  // How many points better than an average team. Mixes recent results with roster ratings (ratings matter less once games pile up).
  function strength(tid, prior, season) {
    let W = 0, M = 0, n = 0;
    prior.forEach(g => {
      if (g.home !== tid && g.away !== tid) return;
      const w = g.season === season ? 1 : g.season === season - 1 ? .4 : .15;
      W += w; M += w * (A.teamScore(g, tid) - A.oppScore(g, tid)); n++;
    });
    const form = W ? M / W : 0;
    const roster = (rosterRating(tid) - leagueRating()) * 2.5;
    return { pts: (M + 5 * roster) / (W + 5), form, roster, games: n, rating: rosterRating(tid) };
  }

  A.odds = {
    phi,
    game(g) {
      const prior = before(g);
      const h = strength(g.home, prior, g.season), a = strength(g.away, prior, g.season);
      const neutral = g.round === 'FINAL';
      const hh = A.h2h(prior, g.home, g.away);
      const series = hh.n ? Math.max(-3, Math.min(3, .15 * (hh.aPF - hh.bPF) / hh.n)) : 0;
      const margin = h.pts - a.pts + (neutral ? 0 : HOME) + series;
      const pHome = Math.min(.97, Math.max(.03, phi(margin / GAME_SD)));
      const avg = prior.length ? prior.reduce((s, x) => s + n0(x.hs) + n0(x.as), 0) / (2 * prior.length) : 22;
      const factors = [];
      const nk = A.tNick;
      if (h.games || a.games) factors.push(`Recent results: ${nk(g.home)} ${h.form >= 0 ? '+' : ''}${A.f1(h.form)} a game, ${nk(g.away)} ${a.form >= 0 ? '+' : ''}${A.f1(a.form)} a game`);
      factors.push(`Roster rating: ${nk(g.home)} ${A.f1(h.rating)}, ${nk(g.away)} ${A.f1(a.rating)}`);
      if (!neutral) factors.push(`Home field: about +${HOME} point${HOME === 1 ? "" : "s"} for the ${nk(g.home)}`); else factors.push('Neutral field for the ' + A.LEAGUE.champGame);
      if (hh.n) factors.push(`Series history: ${hh.n} meeting${hh.n > 1 ? 's' : ''}, worth ${series >= 0 ? '+' : ''}${A.f1(series)} for the ${nk(g.home)}`);
      return {
        pHome, pAway: 1 - pHome, margin,
        projHome: Math.max(0, Math.round(avg + margin / 2)), projAway: Math.max(0, Math.round(avg - margin / 2)),
        fav: pHome >= .5 ? g.home : g.away, favP: Math.max(pHome, 1 - pHome), factors, games: prior.length,
      };
    },

    // Chance a pick's OVER hits. Uses the player's (or team's) past games; with little history it stays close to 50/50.
    prop(prop, g) {
      let vals;
      if (prop.kind === 'player') vals = A.props.history(prop.pid, prop.key, g).slice(-8).map(x => x.v);
      else {
        const prior = before(g);
        const pts = t => prior.filter(x => x.home === t || x.away === t).slice(-8).map(x => A.teamScore(x, t));
        if (prop.kind === 'team') vals = pts(prop.tid);
        else { const a = pts(g.home), b = pts(g.away); const k = Math.min(a.length, b.length); vals = []; for (let i = 0; i < k; i++) vals.push(a[a.length - k + i] + b[b.length - k + i]); }
      }
      const n = vals.length;
      if (!n) return { over: .5, under: .5, n: 0 };
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const sd = Math.max(Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n), .35 * mean + .8);
      const model = 1 - phi((prop.line - mean) / sd);
      const over = Math.min(.95, Math.max(.05, (n * model + 2 * .5) / (n + 2)));
      return { over, under: 1 - over, n, mean };
    },

    // How good have the game odds been? Grades every played game using only what was known before it.
    record() {
      const done = S().games.filter(g => g.played).sort((a, b) => a.season - b.season || a.week - b.week);
      let right = 0, n = 0; const upsets = [];
      done.forEach(g => {
        const o = this.game(g), w = A.winnerOf(g); if (!w) return;
        n++; if (w === o.fav) right++;
        const pW = w === g.home ? o.pHome : o.pAway;
        if (pW < .38) upsets.push({ g, w, p: pW });
      });
      return { n, right, pct: n ? right / n : 0, upsets: upsets.sort((a, b) => a.p - b.p) };
    },
  };
  A.pct0 = p => Math.round(p * 100) + '%';
})(globalThis);
