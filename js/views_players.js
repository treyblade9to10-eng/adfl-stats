// Players list + player pages
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const n0 = A.num;

  const scopeGames = (scope, s) => {
    const gs = ST().state.games.filter(g => g.played);
    if (scope === 'career') return gs;
    if (scope === 'playoffs') return gs.filter(g => g.season === s && g.type === 'playoff');
    return gs.filter(g => g.season === s && g.type === 'reg');
  };
  UI.scopeGames = scopeGames;
  UI.scopeTabs = (cur, hrefFn) => UI.tabs([['season', 'Season'], ['playoffs', 'Playoffs'], ['career', 'Career']], cur, hrefFn);

  // ---------- list ----------
  UI.views.players = function (args, q) {
    const s = UI.season, scope = q.scope || 'season', grp = q.grp || 'pass', team = q.team || '', search = (q.q || '').toLowerCase();
    const ag = A.aggPlayers(scopeGames(scope, s));
    let rows = [...ag.values()].filter(x => ST().P(x.pid) && UI.hasGroup(x, grp));
    if (team) rows = rows.filter(x => ST().P(x.pid).team === team);
    if (search) rows = rows.filter(x => ST().P(x.pid).name.toLowerCase().includes(search));
    const gdef = A.GROUPS.find(g => g.id === grp);
    const base = { pass: 'py', rush: 'ry', rec: 'recy', def: 'tkl', kick: 'fgm', punt: 'pny', ret: 'kry' }[grp];
    rows.sort((a, b) => b[base] - a[base]);
    let h = UI.title('Players', `${ST().state.players ? Object.keys(ST().state.players).length : 0} players on the league`, `<a class="btn sm" href="#/players?view=all">Browse all players</a>`);
    if (q.view === 'all') return h + allPlayers(q);
    h += UI.scopeTabs(scope, v => `#/players?scope=${v}&grp=${grp}&team=${team}`);
    h += UI.tabs(A.GROUPS.map(g => [g.id, g.title]), grp, v => `#/players?scope=${scope}&grp=${v}&team=${team}`);
    h += `<div class="row wrapr"><select data-change="plTeam"><option value="">All teams</option>${A.TEAMS.map(t => `<option value="${t.id}" ${t.id === team ? 'selected' : ''}>${esc(A.tName(t.id))}</option>`).join('')}</select>
      <input class="search" type="search" placeholder="Search a player" value="${esc(q.q || '')}" data-change="plSearch"></div>`;
    h += UI.card(`${gdef.title} / ${scope === 'career' ? 'Career' : scope === 'playoffs' ? `Season ${s} playoffs` : `Season ${s}`}`, rows.length ? UI.table([
      { h: '#', v: r => 0, f: r => '', cls: 'num' }, { h: 'Player', v: r => ST().P(r.pid).name, f: r => UI.plink(r.pid) }, { h: 'Team', v: r => ST().P(r.pid).team || '', f: r => ST().P(r.pid).team ? UI.badge(ST().P(r.pid).team) : '' },
      { h: 'GP', v: r => r.gp, cls: 'num' }].concat(UI.statCols(grp)), rows) : UI.empty('No stats recorded here yet. Play and save a game and they appear.'));
    UI.after = main => { main.querySelectorAll('table.sortable tbody tr').forEach((tr, i) => { tr.cells[0].textContent = i + 1; }); };
    return h;
  };
  UI.changes.plTeam = el => UI.setQ({ team: el.value });
  UI.changes.plSearch = el => UI.setQ({ q: el.value });

  function allPlayers(q) {
    const team = q.team || '', search = (q.q || '').toLowerCase();
    let ps = Object.values(ST().state.players);
    if (team) ps = ps.filter(p => p.team === team);
    if (search) ps = ps.filter(p => p.name.toLowerCase().includes(search));
    return `<div class="row wrapr"><select data-change="plTeam"><option value="">All teams</option>${A.TEAMS.map(t => `<option value="${t.id}" ${t.id === team ? 'selected' : ''}>${esc(A.tName(t.id))}</option>`).join('')}</select>
      <input class="search" type="search" placeholder="Search a player" value="${esc(q.q || '')}" data-change="plSearch"></div>` +
      UI.card('All players', UI.table([
        { h: 'Player', v: r => r.name, f: r => UI.plink(r.id) }, { h: 'Team', v: r => r.team || 'ZZ', f: r => r.team ? UI.tlink(r.team, 'nick') : '<span class="dim">Free agent</span>' },
        { h: 'POS', v: r => A.POSITIONS.indexOf(r.pos), f: r => r.pos }, { h: '#', v: r => r.num, cls: 'num' }, { h: 'OVR', v: r => r.ovr, cls: 'num' }], ps));
  }

  // ---------- player page ----------
  UI.views.player = function ([pid], q) {
    const p = ST().P(pid); if (!p) return UI.empty('Player not found.');
    const tab = q.tab || 'overview';
    const played = ST().state.games.filter(g => g.played);
    const log = A.playerLog(played, pid);
    const T = p.team ? A.team(p.team) : null;
    const awards = A.playerAwards(pid);
    let h = `<div class="thead" style="--c1:${T ? T.c1 : '#444'};--c2:${T ? T.c2 : '#888'}">${p.team ? UI.badge(p.team, 'xl') : ''}<div><h1>${esc(p.name)}</h1>
      <div class="sub">${p.pos} / #${p.num} / ${p.team ? UI.tlink(p.team) : 'Free agent'} / Rating ${p.ovr}${p.rookie ? ' / Rookie' : ''}</div>
      <div class="chips">${awards.length ? `<span class="gold">${awards.length} award${awards.length > 1 ? 's' : ''}</span>` : ''}<span>${log.length} game${log.length === 1 ? '' : 's'} played</span><button class="sm" data-act="editPlayer" data-id="${pid}">Edit player</button></div></div></div>`;
    h += UI.tabs([['overview', 'Overview'], ['log', 'Game log'], ['splits', 'Vs. opponents'], ['awards', 'Awards']], tab, t => `#/player/${pid}?tab=${t}`);
    if (!log.length) return h + UI.card('', UI.empty('No stats yet. This player shows up here once he has a line in a saved game.'));
    return h + ({ overview: pOverview, log: pLog, splits: pSplits, awards: pAwards }[tab] || pOverview)(p, log, played);
  };

  // which groups matter for this player
  function groupsFor(totals) { return A.GROUPS.filter(g => UI.hasGroup(totals, g.id)); }

  function pOverview(p, log, played) {
    const pid = p.id;
    const seasons = [...new Set(log.map(r => r.g.season))];
    const per = seasons.map(s => ({ s, t: A.aggPlayers(played.filter(g => g.season === s && g.type === 'reg')).get(pid), po: A.aggPlayers(played.filter(g => g.season === s && g.type === 'playoff')).get(pid) }));
    const career = A.aggPlayers(played).get(pid);
    const groups = groupsFor(career);
    let h = '';
    groups.forEach(grp => {
      const rows = [];
      per.forEach(x => { if (x.t && UI.hasGroup(x.t, grp.id)) rows.push({ label: 'Season ' + x.s, s: x.t }); if (x.po && UI.hasGroup(x.po, grp.id)) rows.push({ label: `Season ${x.s} playoffs`, s: x.po }); });
      rows.push({ label: 'Career', s: career, tot: true });
      h += UI.card(grp.title, UI.table([{ h: '', v: r => r.label, f: r => r.tot ? `<b>${r.label}</b>` : r.label }, { h: 'GP', v: r => r.s.gp, cls: 'num' }].concat(UI.statCols(grp.id).map(c => ({ h: c.h, title: c.title, cls: c.cls, v: r => c.v(r.s), f: r => c.f ? c.f(r.s) : c.v(r.s) }))), rows, { sortable: false, rowCls: r => r.tot ? 'tot' : '' }));
    });
    const f = A.playerFacts(log);
    h += `<div class="cols2">`;
    h += UI.card('Career highs', f.hi.length ? f.hi.map(x => `<div class="lrow"><span>${x.label}</span><span><b>${x.v}</b> <a class="dim" href="#/game/${x.r.g.id}">vs ${A.tNick(x.r.opp)}, ${A.weekName(x.r.g.week).replace('Conference ', '')} S${x.r.g.season}</a></span></div>`).join('') : '<div class="dim">None yet</div>');
    h += UI.card('Milestones', f.cnt.length ? f.cnt.map(x => `<div class="lrow"><span>${x.label}</span><b>${x.n} of ${x.of} games</b></div>`).join('') : '<div class="dim">None yet</div>');
    h += `</div>`;
    if (f.streaks.length) h += UI.card('Streaks (best / current)', f.streaks.map(x => `<div class="lrow"><span>${x.label}</span><b>${x.best} / ${x.cur}</b></div>`).join(''));
    // pick history for this player
    const picks = ST().state.picks.filter(x => x.pid === pid && x.result);
    if (picks.length) h += UI.card('Your over/under picks on him', picks.map(x => `<div class="lrow"><span>${esc(x.label)} ${x.side} ${x.line}</span><b class="res ${x.result}">${x.result} <span class="dim">(${x.actual})</span></b></div>`).join(''));
    return h;
  }

  function pLog(p, log) {
    const career = A.aggPlayers(log.map(r => r.g)).get(p.id);
    const groups = groupsFor(career);
    // one table per group, each row is a game
    let h = '';
    groups.forEach(grp => {
      const keys = grp.cols;
      h += UI.card(grp.title + ' / game log', UI.table([
        { h: 'Game', v: r => r.g.season * 100 + r.g.week, f: r => `<a href="#/game/${r.g.id}">S${r.g.season} ${r.g.type === 'playoff' ? 'PO' : 'W' + r.g.week}</a>` },
        { h: 'Opp', v: r => A.tName(r.opp), f: r => `${r.g.home === r.ln.t ? 'vs' : '@'} ${UI.badge(r.opp)}` },
        { h: 'Result', v: r => r.me - r.op, f: r => `<span class="res ${r.res}">${r.res}</span> ${r.me}-${r.op}` },
      ].concat(keys.map(([k, lab]) => ({ h: lab, cls: 'num', v: r => n0(r.ln[k]), f: r => r.ln[k] == null ? '<span class="dim">0</span>' : r.ln[k] }))), log.filter(r => keys.some(([k]) => n0(r.ln[k]) !== 0))));
    });
    return h;
  }

  function pSplits(p, log) {
    const byOpp = {};
    log.forEach(r => { (byOpp[r.opp] = byOpp[r.opp] || []).push(r.g); });
    const rows = Object.keys(byOpp).map(t => { const ag = A.aggPlayers(byOpp[t]).get(p.id); return { t, s: ag }; });
    const career = A.aggPlayers(log.map(r => r.g)).get(p.id);
    const groups = groupsFor(career);
    return groups.map(grp => UI.card(grp.title + ' / by opponent', UI.table([{ h: 'Opponent', v: r => A.tName(r.t), f: r => UI.tlink(r.t, 'nick') }, { h: 'GP', v: r => r.s.gp, cls: 'num' }].concat(UI.statCols(grp.id).map(c => ({ h: c.h, title: c.title, cls: c.cls, v: r => c.v(r.s), f: r => c.f ? c.f(r.s) : c.v(r.s) }))), rows.filter(r => UI.hasGroup(r.s, grp.id))))).join('');
  }

  function pAwards(p) {
    const aw = A.playerAwards(p.id).sort((a, b) => b.season - a.season);
    return UI.card('Awards', aw.length ? aw.map(a => `<div class="lrow"><span>${esc(A.awardName(a.type))}</span><b>Season ${a.season}${a.week ? ', Week ' + a.week : ''}</b></div>`).join('') : UI.empty('No awards yet. Give some in the Awards tab.'));
  }
})(globalThis);
