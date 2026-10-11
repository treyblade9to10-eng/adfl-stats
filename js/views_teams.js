// Teams and team pages
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const n0 = A.num;
  const all = () => ST().state.games;
  const playedAll = () => all().filter(g => g.played);

  // Column sets for aggregated stat tables (shared with players + leaders)
  UI.statCols = function (gid) {
    const N = { cls: 'num' };
    const c = (h, v, f, title) => Object.assign({ h, v, f, title }, N);
    const o = {
      pass: [c('CMP', s => s.pc), c('ATT', s => s.pa), c('CMP%', s => s.cmpPct, s => A.f1(s.cmpPct)), c('YDS', s => s.py), c('YPG', s => s.ypg, s => A.f1(s.ypg)), c('Y/A', s => s.ypa, s => A.f1(s.ypa)), c('TD', s => s.ptd), c('INT', s => s.pint), c('SCK', s => s.psk), c('RTG', s => s.rating, s => A.f1(s.rating), 'Passer rating'), c('LNG', s => s.plng)],
      rush: [c('ATT', s => s.ra), c('YDS', s => s.ry), c('YPG', s => s.rypg, s => A.f1(s.rypg)), c('Y/A', s => s.ypc, s => A.f1(s.ypc)), c('TD', s => s.rtd), c('LNG', s => s.rlng), c('FUM', s => s.fum)],
      rec: [c('TGT', s => s.tg), c('REC', s => s.rec), c('YDS', s => s.recy), c('YPG', s => s.recypg, s => A.f1(s.recypg)), c('Y/R', s => s.ypr, s => A.f1(s.ypr)), c('TD', s => s.rectd), c('LNG', s => s.reclng), c('CTCH%', s => s.catchPct, s => A.f1(s.catchPct), 'Catch rate'), c('DRP', s => s.drp)],
      def: [c('TKL', s => s.tkl), c('T/G', s => s.tklpg, s => A.f1(s.tklpg)), c('TFL', s => s.tfl), c('SCK', s => s.sck), c('INT', s => s.dint), c('PD', s => s.pd), c('FF', s => s.ff), c('FR', s => s.fr), c('TD', s => s.dtd)],
      kick: [c('FGM', s => s.fgm), c('FGA', s => s.fga), c('FG%', s => s.fgPct, s => A.f1(s.fgPct)), c('LNG', s => s.fglng), c('XPM', s => s.xpm), c('XPA', s => s.xpa), c('XP%', s => s.xpPct, s => A.f1(s.xpPct)), c('PTS', s => s.fgm * 3 + s.xpm)],
      punt: [c('PUNTS', s => s.pn), c('YDS', s => s.pny), c('AVG', s => s.ypp, s => A.f1(s.ypp)), c('IN20', s => s.pn20), c('LNG', s => s.pnlng)],
      ret: [c('KR', s => s.kr), c('YDS', s => s.kry), c('AVG', s => A.div0(s.kry, s.kr), s => A.f1(A.div0(s.kry, s.kr))), c('TD', s => s.krtd), c('PR', s => s.pr), c('YDS', s => s.pry), c('TD', s => s.prtd)],
    };
    return o[gid];
  };
  UI.hasGroup = (s, gid) => A.GROUPS.find(g => g.id === gid).cols.some(col => s[col[0]] > 0);

  // ---------- Teams list ----------
  UI.views.teams = function () {
    const s = UI.season, reg = ST().seasonGames(s).filter(g => g.type === 'reg');
    const ag = A.aggTeams(reg), life = A.aggTeams(playedAll());
    const titles = {}; ST().seasons().forEach(se => { const c = ST().champion(se); if (c) titles[c.team] = (titles[c.team] || 0) + 1; });
    let h = UI.title('Teams', '12 teams / 2 conferences / 4 divisions');
    A.CONFS.forEach(c => {
      h += `<h2 class="sec">${esc(c.name)}</h2><div class="tgridc">`;
      A.DIVS.filter(d => d.conf === c.id).forEach(d => {
        h += `<section class="card"><h3>${esc(d.name)}</h3>${A.divTeams(d.id).map(t => {
          const T = ag[t], L = life[t];
          return `<a class="trow" href="#/team/${t}">${UI.badge(t, 'lg')}<div class="tn"><b>${esc(A.tName(t))}</b><div class="dim">Season ${s}: ${A.rec(T.w, T.l, T.t)} / All-time: ${A.rec(L.w, L.l, L.t)}${titles[t] ? ' / ' + titles[t] + ' title' + (titles[t] > 1 ? 's' : '') : ''}</div></div></a>`;
        }).join('')}</section>`;
      });
      h += `</div>`;
    });
    return h;
  };

  // ---------- Team page ----------
  UI.views.team = function ([tid], q) {
    const T = A.team(tid); if (!T) return UI.empty('Team not found.');
    const tab = q.tab || 'overview', s = UI.season;
    const seasonGames = ST().seasonGames(s);
    const ag = A.aggTeams(seasonGames);       // everything in the season (reg + playoffs) for team numbers
    const ar = A.aggTeams(seasonGames.filter(g => g.type === 'reg'));
    const life = A.aggTeams(playedAll())[tid];
    const titles = ST().seasons().filter(se => { const c = ST().champion(se); return c && c.team === tid; });
    const R = ar[tid];
    let h = `<div class="thead" style="--c1:${T.c1};--c2:${T.c2}">${UI.badge(tid, 'xl')}<div><h1>${esc(A.tName(tid))}</h1>
      <div class="sub">${esc(A.conf(T.conf).name)} / ${esc(A.div(T.div).name)} Division</div>
      <div class="chips"><span>Season ${s}: <b>${A.rec(R.w, R.l, R.t)}</b></span><span>All-time: <b>${A.rec(life.w, life.l, life.t)}</b></span>${titles.length ? `<span class="gold">${titles.length}x champion (Season ${titles.join(', ')})</span>` : ''}</div></div></div>`;
    h += UI.tabs([['overview', 'Overview'], ['roster', 'Roster'], ['schedule', 'Schedule'], ['stats', 'Team stats'], ['splits', 'Splits'], ['history', 'Vs. every team']], tab, t => `#/team/${tid}?tab=${t}`);
    const body = { overview: teamOverview, roster: teamRoster, schedule: teamSchedule, stats: teamStats, splits: teamSplits, history: teamHistory }[tab] || teamOverview;
    return h + body(tid, s, ag, ar);
  };

  function teamOverview(tid, s, ag, ar) {
    const R = ar[tid];
    const gs = ST().seasonGames(s).filter(g => g.home === tid || g.away === tid).sort((a, b) => a.week - b.week);
    const next = gs.find(g => !g.played);
    const last = gs.filter(g => g.played).slice(-5).reverse();
    let h = '<div class="cols2">';
    h += UI.card('This season', `<div class="stats4">
      <div><b>${A.rec(R.w, R.l, R.t)}</b><span>Record</span></div><div><b>${R.gp ? A.f1(R.pf / R.gp) : '-'}</b><span>Points / game</span></div>
      <div><b>${R.gp ? A.f1(R.pa / R.gp) : '-'}</b><span>Allowed / game</span></div><div><b>${(R.diff > 0 ? '+' : '') + R.diff}</b><span>Point diff</span></div></div>
      ${R.streak ? `<div class="note">Current streak: ${R.streak.kind}${R.streak.n}. Last 5: ${R.last5.w}-${R.last5.l}.</div>` : ''}`);
    h += UI.card('Next game', next ? UI.gameCard(next) : UI.empty('No more games scheduled this season.'));
    h += '</div>';
    if (last.length) h += `<h2 class="sec">Recent results</h2><div class="gwrap">${last.map(UI.gameCard).join('')}</div>`;
    // awards by this team's players
    const aw = ST().state.awards.filter(a => (a.pid && ST().P(a.pid) && ST().P(a.pid).team === tid) || a.tid === tid).slice(-8);
    if (aw.length) h += UI.card('Awards', aw.map(a => `<div class="lrow"><span>${esc(A.awardName(a.type))} / Season ${a.season}${a.week ? ' Wk ' + a.week : ''}</span><b>${a.pid ? UI.plink(a.pid) : esc(A.tName(a.tid))}</b></div>`).join(''));
    // top players
    const ag2 = A.aggPlayers(ST().seasonGames(s).filter(g => g.type === 'reg'));
    const mine = [...ag2.values()].filter(x => x.teams.has(tid));
    const top = (k, l) => { const b = mine.filter(x => x[k] > 0).sort((a, c) => c[k] - a[k])[0]; return b ? `<div class="lrow"><span>${l}</span><b>${UI.plink(b.pid)} (${b[k]})</b></div>` : ''; };
    const t = top('py', 'Passing yards') + top('ry', 'Rushing yards') + top('recy', 'Receiving yards') + top('sck', 'Sacks') + top('dint', 'Interceptions') + top('tkl', 'Tackles');
    if (t) h += UI.card('Team leaders', t);
    return h;
  }

  function teamRoster(tid, s) {
    const ros = ST().roster(tid);
    const ag = A.aggPlayers(ST().seasonGames(s).filter(g => g.type === 'reg'));
    const rows = ros.map(p => ({ p, s: ag.get(p.id) }));
    const line = r => {
      const s = r.s; if (!s) return '<span class="dim">-</span>';
      const pos = r.p.pos;
      if (pos === 'QB') return `${s.pc}/${s.pa}, ${s.py} yds, ${s.ptd} TD, ${s.pint} INT`;
      if (pos === 'RB') return `${s.ra} car, ${s.ry} yds, ${s.rtd} TD` + (s.rec ? `; ${s.rec} rec, ${s.recy} yds` : '');
      if (pos === 'WR' || pos === 'TE') return `${s.rec} rec, ${s.recy} yds, ${s.rectd} TD`;
      if (pos === 'K') return `FG ${s.fgm}/${s.fga}, XP ${s.xpm}/${s.xpa}`;
      if (pos === 'P') return `${s.pn} punts, ${A.f1(s.ypp)} avg`;
      if (pos === 'OL') return '-';
      return `${s.tkl} tkl, ${s.sck} sck, ${s.dint} INT`;
    };
    let h = UI.card(`Roster / Season ${s} stats`, UI.table([
      { h: '#', v: r => r.p.num, cls: 'num' }, { h: 'Player', v: r => r.p.name, f: r => UI.plink(r.p.id) + (r.p.rookie ? ' <span class="tagp rk">R</span>' : '') },
      { h: 'POS', v: r => A.POSITIONS.indexOf(r.p.pos), f: r => r.p.pos }, { h: 'OVR', v: r => r.p.ovr, cls: 'num' }, { h: 'GP', v: r => r.s ? r.s.gp : 0, cls: 'num' },
      { h: 'Season line', v: r => r.s ? r.s.impact : 0, f: line },
    ], rows, { sortable: true }) + `<div class="row"><button data-act="addPlayer" data-t="${tid}">Add player</button></div>`);
    return h;
  }

  function teamSchedule(tid, s) {
    const gs = ST().seasonGames(s).filter(g => g.home === tid || g.away === tid).sort((a, b) => a.week - b.week);
    return UI.card(`Season ${s} schedule`, UI.table([
      { h: 'Week', v: r => r.week, f: r => UI.when(r) }, { h: '', v: () => '', f: r => r.home === tid ? 'vs' : '@' }, { h: 'Opponent', v: r => A.tName(A.oppOf(r, tid)), f: r => UI.tlink(A.oppOf(r, tid)) },
      { h: 'Result', v: r => r.played ? A.teamScore(r, tid) - A.oppScore(r, tid) : -99, f: r => r.played ? `<span class="res ${A.winnerOf(r) === tid ? 'W' : A.winnerOf(r) ? 'L' : 'T'}">${A.winnerOf(r) === tid ? 'W' : A.winnerOf(r) ? 'L' : 'T'}</span> ${A.teamScore(r, tid)}-${A.oppScore(r, tid)}` : '<span class="dim">-</span>' },
      { h: '', v: () => '', f: r => `<a class="btn sm" href="#/${r.played ? 'game' : 'record'}/${r.id}">${r.played ? 'Box' : 'Record'}</a>` },
    ], gs, { sortable: false }));
  }

  function teamStats(tid, s, ag, ar) {
    const rank = (fn, hi) => { const arr = A.TEAMS.map(t => ({ t: t.id, v: fn(ar[t.id]) })).filter(x => ar[x.t].gp).sort((a, b) => hi ? b.v - a.v : a.v - b.v); const i = arr.findIndex(x => x.t === tid); return i < 0 ? '-' : A.ord(i + 1); };
    const pg = (T, v) => A.div0(v, T.gp);
    const R = ar[tid];
    if (!R.gp) return UI.card('Team stats', UI.empty('No games played yet this season.'));
    const rows = [
      ['Points per game', T => pg(T, T.pf), 1, A.f1], ['Points allowed per game', T => pg(T, T.pa), 0, A.f1],
      ['Total yards per game', T => pg(T, T.off.totY), 1, A.f1], ['Passing yards per game', T => pg(T, T.off.passY), 1, A.f1], ['Rushing yards per game', T => pg(T, T.off.rushY), 1, A.f1],
      ['Yards allowed per game', T => pg(T, T.def.totY), 0, A.f1], ['Pass yards allowed per game', T => pg(T, T.def.passY), 0, A.f1], ['Rush yards allowed per game', T => pg(T, T.def.rushY), 0, A.f1],
      ['Yards per rush', T => A.div0(T.off.ry, T.off.ra), 1, A.f2], ['Yards per pass attempt', T => A.div0(T.off.py, T.off.pa), 1, A.f2],
      ['Completion %', T => 100 * A.div0(T.off.pc, T.off.pa), 1, A.f1], ['First downs per game', T => pg(T, T.off.fd), 1, A.f1],
      ['3rd down %', T => 100 * A.div0(T.off.thM, T.off.thA), 1, A.f1], ['4th down %', T => 100 * A.div0(T.off.foM, T.off.foA), 1, A.f1], ['Red zone TD %', T => 100 * A.div0(T.off.rzM, T.off.rzA), 1, A.f1],
      ['Opp 3rd down %', T => 100 * A.div0(T.def.thM, T.def.thA), 0, A.f1],
      ['Sacks per game', T => pg(T, T.off.sck), 1, A.f1], ['Sacks allowed per game', T => pg(T, T.off.psk), 0, A.f1],
      ['Takeaways', T => T.takeaways, 1, x => x], ['Giveaways', T => T.giveaways, 0, x => x], ['Turnover margin', T => T.takeaways - T.giveaways, 1, x => (x > 0 ? '+' : '') + x],
      ['Penalties per game', T => pg(T, T.off.pen), 0, A.f1], ['Penalty yards per game', T => pg(T, T.off.penY), 0, A.f1], ['Time of possession', T => pg(T, T.off.top), 1, A.mmss],
      ['Field goal %', T => 100 * A.div0(T.off.fgm, T.off.fga), 1, A.f1],
    ];
    return UI.card(`Season ${s} (regular season)`, UI.table([
      { h: 'Stat', v: r => r[0], f: r => r[0] }, { h: 'Value', v: r => r[1](R), f: r => r[3](r[1](R)), cls: 'num' }, { h: 'League rank', v: r => 0, f: r => rank(r[1], r[2]), cls: 'num' },
    ], rows, { sortable: false }));
  }

  function teamSplits(tid) {
    const sp = A.situations(playedAll(), tid);
    if (!sp.length) return UI.card('Splits', UI.empty('Record some games and the splits show up here: when leading at the half, when scoring first, in one-score games, and more.'));
    return UI.card('All-time record when...', UI.table([
      { h: 'Situation', v: r => r.label }, { h: 'Record', v: r => A.winp(r.w, r.l, r.t), f: r => A.rec(r.w, r.l, r.t), cls: 'num' },
      { h: 'Win %', v: r => A.winp(r.w, r.l, r.t), f: r => A.fpct(A.winp(r.w, r.l, r.t)), cls: 'num' }, { h: 'Games', v: r => r.n, cls: 'num' },
    ], sp, { sortable: true }) + '<div class="note">Tap a column to sort. Splits use every saved game across all seasons.</div>');
  }

  function teamHistory(tid) {
    const rows = A.TEAMS.filter(t => t.id !== tid).map(t => { const h = A.h2h(playedAll(), tid, t.id); return { t: t.id, h }; });
    return UI.card('All-time vs. every team', UI.table([
      { h: 'Opponent', v: r => A.tName(r.t), f: r => UI.tlink(r.t) }, { h: 'GP', v: r => r.h.n, cls: 'num' },
      { h: 'Record', v: r => A.winp(r.h.aW, r.h.bW, r.h.t), f: r => r.h.n ? A.rec(r.h.aW, r.h.bW, r.h.t) : '-', cls: 'num' },
      { h: 'PF', v: r => r.h.aPF, cls: 'num' }, { h: 'PA', v: r => r.h.bPF, cls: 'num' }, { h: 'Avg margin', v: r => r.h.n ? (r.h.aPF - r.h.bPF) / r.h.n : 0, f: r => r.h.n ? ((r.h.aPF - r.h.bPF) / r.h.n > 0 ? '+' : '') + A.f1((r.h.aPF - r.h.bPF) / r.h.n) : '-', cls: 'num' },
      { h: 'Streak', v: r => r.h.streak ? (r.h.streak.team === tid ? r.h.streak.n : -r.h.streak.n) : 0, f: r => r.h.streak ? (r.h.streak.team === tid ? 'W' : 'L') + r.h.streak.n : '-', cls: 'num' },
      { h: '', v: () => '', f: r => `<a class="btn sm" href="#/matchup/${tid}/${r.t}">Rematch center</a>` },
    ], rows, { sortable: true }));
  }

  // ---------- edit roster ----------
  const playerForm = (p, tid) => `<h3>${p.id ? 'Edit player' : 'Add player'}</h3>
    <label class="blk">Name<input id="pfName" value="${esc(p.name || '')}"></label>
    <div class="row wrapr"><label class="inl">Number<input id="pfNum" type="number" min="0" max="99" value="${p.num == null ? '' : p.num}" style="width:70px"></label>
    <label class="inl">Position<select id="pfPos">${A.POSITIONS.map(x => `<option ${x === p.pos ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="inl">Rating<input id="pfOvr" type="number" min="40" max="99" value="${p.ovr || 70}" style="width:70px"></label>
    <label class="inl">Team<select id="pfTeam"><option value="">Free agent</option>${A.TEAMS.map(t => `<option value="${t.id}" ${t.id === (p.team || tid) ? 'selected' : ''}>${esc(A.tName(t.id))}</option>`).join('')}</select></label>
    <label class="inl"><input id="pfRk" type="checkbox" ${p.rookie ? 'checked' : ''}> Rookie</label></div>
    <div class="row end"><button data-act="closeModal">Cancel</button><button class="gold" data-act="savePlayer" data-id="${p.id || ''}">Save</button></div>`;
  UI.playerForm = playerForm;
  UI.acts.addPlayer = el => UI.modal(playerForm({ name: '', num: '', pos: 'WR', ovr: 72, team: el.dataset.t, rookie: true }, el.dataset.t), 'small');
  UI.acts.editPlayer = el => UI.modal(playerForm(ST().P(el.dataset.id)), 'small');
  UI.acts.savePlayer = el => {
    const v = id => document.getElementById(id);
    const o = { name: v('pfName').value.trim() || 'New Player', num: +v('pfNum').value || 0, pos: v('pfPos').value, ovr: Math.max(40, Math.min(99, +v('pfOvr').value || 70)), team: v('pfTeam').value || null, rookie: v('pfRk').checked };
    if (el.dataset.id) ST().updatePlayer(el.dataset.id, o); else ST().addPlayer(o);
    UI.closeModal(); UI.render(); UI.toast('Saved');
  };
})(globalThis);
