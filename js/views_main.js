// Home, Schedule, Standings
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const games = (season) => ST().seasonGames(season);
  const allPlayed = () => ST().state.games.filter(g => g.played);

  // one-line headline fact for an upcoming game
  function headline(g) {
    const h = A.h2h(allPlayed(), g.home, g.away);
    if (!h.n) return 'First ever meeting';
    const lead = h.aW === h.bW ? `series tied ${h.aW}-${h.bW}` : `${A.tNick(h.aW > h.bW ? g.home : g.away)} lead ${Math.max(h.aW, h.bW)}-${Math.min(h.aW, h.bW)}`;
    return `Met ${h.n} time${h.n > 1 ? 's' : ''}, ${lead}` + (h.streak && h.streak.n >= 2 ? `, ${A.tNick(h.streak.team)} won last ${h.streak.n}` : '');
  }
  UI.headline = headline;

  function gameCard(g) {
    const tag = g.type === 'playoff' ? `<span class="tagp">${g.round === 'FINAL' ? A.LEAGUE.champGame : A.LEAGUE.roundNames[g.week]}</span>` : (g.kind === 'div' ? '<span class="tagp dv">Division</span>' : g.kind === 'cross' ? '<span class="tagp x">Aisle vs Drive-Thru</span>' : '');
    const w = g.played ? A.winnerOf(g) : null;
    const row = (tid, score, isHome) => `<div class="gt ${w && w !== tid ? 'lose' : ''}"><span class="gname">${UI.badge(tid)}<a href="#/team/${tid}">${esc(A.tName(tid))}</a>${g.seeds && g.seeds[isHome ? 'home' : 'away'] ? `<i class="seed">${g.seeds[isHome ? 'home' : 'away']}</i>` : ''}</span><b class="gs">${g.played ? score : ''}</b></div>`;
    return `<div class="gcard ${g.played ? 'done' : ''}">
      <div class="gtop">${tag}<span class="dim">${g.type === 'playoff' ? (g.ot ? 'OT' : '') : UI.when(g) + (g.ot ? ' / OT' : '')}</span></div>
      ${row(g.away, g.as, false)}${row(g.home, g.hs, true)}
      <div class="gfoot">${g.played ? `<a class="btn sm" href="#/game/${g.id}">Box score</a>` : `<span class="dim sm">${esc(headline(g))}</span><a class="btn sm gold" href="#/game/${g.id}">Preview</a><a class="btn sm" href="#/record/${g.id}">Record</a>`}</div>
    </div>`;
  }
  UI.gameCard = gameCard;

  // ---------- Home ----------
  UI.views.home = function () {
    const s = UI.season, gs = games(s);
    const wk = ST().currentWeek(s);
    const champ = ST().champion(s);
    const played = gs.filter(g => g.played).length;
    const total = gs.length;
    let h = UI.title(A.LEAGUE.full, `Season ${s} / ${played} of ${total} games played${wk ? ' / ' + A.weekName(wk) + ' is up next' : ''}`);
    if (champ) h += `<section class="card champ"><div class="champl">Season ${s} Champions</div><div class="champn">${UI.badge(champ.team, 'lg')} ${esc(A.tName(champ.team))}</div><div class="dim">${A.LEAGUE.trophy} / ${A.tNick(champ.game.home)} ${champ.game.hs}, ${A.tNick(champ.game.away)} ${champ.game.as}</div></section>`;
    if (wk) {
      const wg = gs.filter(g => g.week === wk);
      h += `<h2 class="sec">${A.weekName(wk)}</h2><div class="gwrap">${wg.map(gameCard).join('')}</div>`;
    } else if (!champ && total) {
      h += UI.card('', '<p>All games are in. If the playoffs have not started, save the last game and they will appear.</p>');
    }
    // standings snapshot + leaders
    const regNow = gs.filter(g => g.type === 'reg');
    const st = A.standings(regNow);
    h += `<div class="cols2">`;
    h += st.confs.map(c => {
      const rows = c.order.map((t, i) => ({ t, i: i + 1, T: st.aggs[t], win: c.winners.includes(t) }));
      return UI.card(esc(c.conf.name), UI.table([
        { h: '#', v: r => r.i, cls: 'num' }, { h: 'Team', v: r => A.tName(r.t), f: r => UI.tlink(r.t) },
        { h: 'W-L', v: r => r.T.pct, f: r => A.rec(r.T.w, r.T.l, r.T.t), cls: 'num' }, { h: 'DIFF', v: r => r.T.diff, f: r => (r.T.diff > 0 ? '+' : '') + r.T.diff, cls: 'num' },
      ], rows, { sortable: false, rowCls: r => r.i === 4 ? 'cutline' : (r.i > 4 ? 'out' : '') }) + '<div class="note">Top 4 make the playoffs (two division winners + two wild cards).</div>');
    }).join('');
    h += `</div>`;
    const ag = A.aggPlayers(regNow);
    const leaders = [['py', 'Passing yards'], ['ry', 'Rushing yards'], ['recy', 'Receiving yards'], ['sck', 'Sacks'], ['dint', 'Interceptions'], ['tkl', 'Tackles']];
    h += UI.card('League leaders', `<div class="lgrid">${leaders.map(([k, l]) => {
      const top = [...ag.values()].filter(x => x[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 3);
      return `<div class="lcol"><div class="lh">${l}</div>${top.length ? top.map((x, i) => `<div class="lrow"><span>${i + 1}. ${UI.plink(x.pid)}</span><b>${x[k]}</b></div>`).join('') : '<div class="dim">No stats yet</div>'}</div>`;
    }).join('')}</div><a class="more" href="#/leaders">All leaderboards</a>`);
    // recent
    const recent = gs.filter(g => g.played).sort((a, b) => b.playedAt - a.playedAt).slice(0, 4);
    if (recent.length) h += `<h2 class="sec">Recent results</h2><div class="gwrap">${recent.map(gameCard).join('')}</div>`;
    return h;
  };

  // ---------- Schedule ----------
  UI.views.schedule = function (args, q) {
    const s = UI.season, gs = games(s);
    const weeks = [...new Set(gs.map(g => g.week))].sort((a, b) => a - b);
    const cur = ST().currentWeek(s) || weeks[weeks.length - 1];
    const team = q.team || '';
    const week = q.week ? +q.week : cur;
    let h = UI.title('Schedule', `Season ${s}`, `<select data-change="schedTeam"><option value="">All teams</option>${A.TEAMS.map(t => `<option value="${t.id}" ${t.id === team ? 'selected' : ''}>${esc(A.tName(t.id))}</option>`).join('')}</select>`);
    if (team) {
      const mine = gs.filter(g => g.home === team || g.away === team).sort((a, b) => a.week - b.week);
      const rows = mine.map(g => { const home = g.home === team, opp = home ? g.away : g.home; const res = g.played ? (A.winnerOf(g) === team ? 'W' : A.winnerOf(g) ? 'L' : 'T') : ''; return { g, home, opp, res }; });
      h += UI.card(esc(A.tName(team)), UI.table([
        { h: 'Week', v: r => r.g.week, f: r => UI.when(r.g) }, { h: '', v: r => r.home ? 'vs' : '@', f: r => r.home ? 'vs' : '@' }, { h: 'Opponent', v: r => A.tName(r.opp), f: r => UI.tlink(r.opp) },
        { h: 'Result', v: r => r.res, f: r => r.g.played ? `<span class="res ${r.res}">${r.res}</span> ${A.teamScore(r.g, team)}-${A.oppScore(r.g, team)}` : '<span class="dim">-</span>' },
        { h: '', f: r => r.g.played ? `<a class="btn sm" href="#/game/${r.g.id}">Box</a>` : `<a class="btn sm" href="#/record/${r.g.id}">Record</a>`, v: () => '' },
      ], rows, { sortable: false }));
      return h;
    }
    h += UI.tabs(weeks.map(w => [w, w <= A.LEAGUE.regWeeks ? 'Wk ' + w : { 11: 'Semis', 12: 'Conf', 13: 'Final' }[w]]), week, w => `#/schedule?week=${w}`);
    const wg = gs.filter(g => g.week === week);
    h += `<h2 class="sec">${A.weekName(week)}</h2><div class="gwrap">${wg.map(gameCard).join('')}</div>`;
    const bye = week <= A.LEAGUE.regWeeks ? [] : A.TEAMS.filter(t => !wg.some(g => g.home === t.id || g.away === t.id));
    if (bye.length) h += `<div class="note">Not playing: ${bye.map(t => esc(A.tCity(t.id))).join(', ')}</div>`;
    return h;
  };
  UI.changes.schedTeam = el => UI.setQ({ team: el.value, week: '' });

  // ---------- Standings ----------
  UI.views.standings = function (args, q) {
    const s = UI.season, gs = games(s), reg = gs.filter(g => g.type === 'reg');
    const st = A.standings(reg);
    let h = UI.title('Standings', `Season ${s} regular season`);
    const mode = q.view || 'div';
    h += UI.tabs([['div', 'Divisions'], ['conf', 'Conference seeding'], ['bracket', 'Playoffs']], mode, v => `#/standings?view=${v}`);
    const cols = [
      { h: 'Team', v: r => A.tName(r.t), f: r => UI.tlink(r.t) },
      { h: 'W', v: r => r.T.w, cls: 'num' }, { h: 'L', v: r => r.T.l, cls: 'num' }, { h: 'T', v: r => r.T.t, cls: 'num' },
      { h: 'PCT', v: r => r.T.pct, f: r => A.fpct(r.T.pct), cls: 'num' }, { h: 'PF', v: r => r.T.pf, cls: 'num' }, { h: 'PA', v: r => r.T.pa, cls: 'num' },
      { h: 'DIFF', v: r => r.T.diff, f: r => (r.T.diff > 0 ? '+' : '') + r.T.diff, cls: 'num' },
      { h: 'STRK', v: r => r.T.streak ? r.T.streak.n * (r.T.streak.kind === 'W' ? 1 : -1) : 0, f: r => r.T.streak ? r.T.streak.kind + r.T.streak.n : '-', cls: 'num' },
      { h: 'L5', v: r => r.T.last5.w, f: r => `${r.T.last5.w}-${r.T.last5.l}`, cls: 'num' },
      { h: 'HOME', v: r => r.T.hw, f: r => A.rec(r.T.hw, r.T.hl, r.T.ht), cls: 'num' }, { h: 'AWAY', v: r => r.T.aw, f: r => A.rec(r.T.aw, r.T.al, r.T.at), cls: 'num' },
      { h: 'DIV', v: r => r.T.dw, f: r => A.rec(r.T.dw, r.T.dl, r.T.dt), cls: 'num' }, { h: 'CONF', v: r => r.T.cw, f: r => A.rec(r.T.cw, r.T.cl, r.T.ct), cls: 'num' },
    ];
    if (mode === 'div') {
      A.CONFS.forEach(c => {
        h += `<h2 class="sec">${esc(c.name)}</h2>`;
        st.divs.filter(d => d.div.conf === c.id).forEach(d => {
          h += UI.card(esc(d.div.name) + ' Division', UI.table(cols, d.teams.map(t => ({ t, T: st.aggs[t] })), { sortable: false }));
        });
      });
    } else if (mode === 'conf') {
      st.confs.forEach(c => {
        const rows = c.order.map((t, i) => ({ t, T: st.aggs[t], i: i + 1 }));
        h += UI.card(esc(c.conf.name) + ' seeding', UI.table([{ h: 'Seed', v: r => r.i, cls: 'num' }].concat(cols, [{ h: '', v: r => '', f: r => c.winners.includes(r.t) ? '<span class="tagp dv">Div winner</span>' : '' }]), rows, { sortable: false, rowCls: r => r.i === 4 ? 'cutline' : (r.i > 4 ? 'out' : '') }) + '<div class="note">Seeds 1-2 are the division winners, 3-4 are wild cards. Ties go to head-to-head, then point differential.</div>');
      });
    } else {
      const po = gs.filter(g => g.type === 'playoff');
      if (!po.length) h += UI.empty('The playoffs start once all 60 regular-season games are saved. The top 4 teams in each conference get in.');
      else [11, 12, 13].forEach(w => { const wg = po.filter(g => g.week === w); if (wg.length) h += `<h2 class="sec">${A.LEAGUE.roundNames[w]}</h2><div class="gwrap">${wg.map(gameCard).join('')}</div>`; });
    }
    return h;
  };
})(globalThis);
