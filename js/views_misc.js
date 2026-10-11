// Leaders, Matchups (rematch center), Awards, Picks, Records, Settings
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const played = () => ST().state.games.filter(g => g.played);

  // ---------- Leaders ----------
  UI.views.leaders = function (args, q) {
    const s = UI.season, scope = q.scope || 'season';
    const games = UI.scopeGames(scope, s);
    const ag = A.aggPlayers(games), tg = A.aggTeams(games);
    const mg = Math.max(1, ...Object.values(tg).map(T => T.gp));
    const rows = [...ag.values()].filter(x => ST().P(x.pid));
    const one = (label, key, opt = {}) => {
      const pool = rows.filter(x => (opt.q ? opt.q(x) : x[key] > 0));
      const top = pool.sort((a, b) => (opt.asc ? a[key] - b[key] : b[key] - a[key])).slice(0, 5);
      const f = opt.f || (v => Number.isInteger(v) ? v : A.f1(v));
      return `<section class="card lead"><h3>${label}</h3>${top.length ? top.map((x, i) => `<div class="lrow"><span>${i + 1}. ${UI.plink(x.pid)} ${UI.badge(ST().P(x.pid).team || [...x.teams][0])}</span><b>${f(x[key])}</b></div>`).join('') : '<div class="dim">No stats yet</div>'}${opt.min ? `<div class="note">${opt.min}</div>` : ''}</section>`;
    };
    let h = UI.title('Leaders', scope === 'career' ? 'Career' : scope === 'playoffs' ? `Season ${s} playoffs` : `Season ${s} regular season`);
    h += UI.scopeTabs(scope, v => `#/leaders?scope=${v}`);
    h += `<h2 class="sec">Offense</h2><div class="lgrid2">`;
    h += one('Passing yards', 'py') + one('Passing TDs', 'ptd') + one('Completion %', 'cmpPct', { q: x => x.pa >= 10 * mg, min: `Min ${10 * mg} attempts` }) + one('Passer rating', 'rating', { q: x => x.pa >= 10 * mg, min: `Min ${10 * mg} attempts` }) + one('Yards per attempt', 'ypa', { q: x => x.pa >= 10 * mg, f: A.f2 });
    h += one('Rushing yards', 'ry') + one('Rushing TDs', 'rtd') + one('Yards per carry', 'ypc', { q: x => x.ra >= 4 * mg, f: A.f2, min: `Min ${4 * mg} carries` }) + one('Scrimmage yards', 'scrim') + one('Touchdowns (skill)', 'tds');
    h += one('Receiving yards', 'recy') + one('Receptions', 'rec') + one('Receiving TDs', 'rectd') + one('Yards per catch', 'ypr', { q: x => x.rec >= 2 * mg, f: A.f1, min: `Min ${2 * mg} catches` }) + one('Catch rate', 'catchPct', { q: x => x.tg >= 3 * mg, f: v => A.f1(v) + '%', min: `Min ${3 * mg} targets` });
    h += `</div><h2 class="sec">Defense</h2><div class="lgrid2">`;
    h += one('Sacks', 'sck') + one('Interceptions', 'dint') + one('Tackles', 'tkl') + one('Tackles for loss', 'tfl') + one('Passes defended', 'pd') + one('Forced fumbles', 'ff') + one('Fumble recoveries', 'fr') + one('Defensive TDs', 'dtd');
    h += `</div><h2 class="sec">Special teams</h2><div class="lgrid2">`;
    h += one('Field goals made', 'fgm') + one('Field goal %', 'fgPct', { q: x => x.fga >= mg / 2, f: v => A.f1(v) + '%', min: `Min ${Math.ceil(mg / 2)} attempts` }) + one('Longest field goal', 'fglng') + one('Points scored', 'pts') + one('Punt average', 'ypp', { q: x => x.pn >= 2 * mg, f: A.f1, min: `Min ${2 * mg} punts` }) + one('Punts inside the 20', 'pn20') + one('Kick return yards', 'kry') + one('Punt return yards', 'pry');
    h += `</div><h2 class="sec">Teams</h2><div class="lgrid2">`;
    const teams = Object.values(tg).filter(T => T.gp);
    const tl = (label, fn, hi, f) => { const top = teams.map(T => ({ T, v: fn(T) })).sort((a, b) => hi ? b.v - a.v : a.v - b.v).slice(0, 5); return `<section class="card lead"><h3>${label}</h3>${top.map((x, i) => `<div class="lrow"><span>${i + 1}. ${UI.tlink(x.T.tid, 'nick')}</span><b>${(f || A.f1)(x.v)}</b></div>`).join('')}</section>`; };
    h += tl('Points per game', T => T.pf / T.gp, true) + tl('Points allowed per game', T => T.pa / T.gp, false) + tl('Total yards per game', T => T.off.totY / T.gp, true) + tl('Passing yards per game', T => T.off.passY / T.gp, true) + tl('Rushing yards per game', T => T.off.rushY / T.gp, true) + tl('Yards allowed per game', T => T.def.totY / T.gp, false) + tl('Takeaways', T => T.takeaways, true, v => v) + tl('Sacks', T => T.off.sck, true, v => v);
    return h + '</div>';
  };

  // ---------- Matchups / rematch center ----------
  UI.views.matchup = function ([a, b], q) {
    const pickT = (id, which) => `<select data-change="mu" data-w="${which}">${A.TEAMS.map(t => `<option value="${t.id}" ${t.id === id ? 'selected' : ''}>${esc(A.tName(t.id))}</option>`).join('')}</select>`;
    a = a || 'MET'; b = b || 'WMT';
    let h = UI.title('Rematch center', 'Everything an announcer would say before these two kick off', `<div class="row">${pickT(a, 'a')}<span class="dim">vs</span>${pickT(b, 'b')}</div>`);
    if (a === b) return h + UI.empty('Pick two different teams.');
    const pl = played();
    const hh = A.h2h(pl, a, b);
    h += `<div class="mu"><div class="mside">${UI.badge(a, 'xl')}<b>${esc(A.tName(a))}</b></div><div class="mscore"><span class="mbig">${hh.aW}</span><span class="dim">${hh.t ? '-' + hh.t + '-' : '-'}</span><span class="mbig">${hh.bW}</span><div class="dim">${hh.n ? 'All-time series' : 'No games yet'}</div></div><div class="mside r"><b>${esc(A.tName(b))}</b>${UI.badge(b, 'xl')}</div></div>`;
    // fake game for notes
    const fake = { id: 'x', home: a, away: b, season: UI.season };
    const upcoming = ST().state.games.find(g => !g.played && ((g.home === a && g.away === b) || (g.home === b && g.away === a)));
    if (upcoming) h += `<div class="row"><a class="btn gold" href="#/game/${upcoming.id}">Next meeting: ${UI.when(upcoming)}, Season ${upcoming.season}</a></div>`;
    const f = A.broadcastFacts(pl, a, b, UI.season);
    const sec = (name, list) => list.length ? `<div class="nsec"><div class="nh">${name}</div><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    h += `<div class="cols2">${UI.card('Broadcast notes', sec('The series', f.series) + sec('Form', f.form) + sec('Matchup', f.edges) + sec('Situations', f.splits) + sec('Players in this series', f.players), 'notes')}`;
    // side-by-side
    const season = A.aggTeams(ST().seasonGames(UI.season).filter(g => g.type === 'reg')), life = A.aggTeams(pl);
    const cmp = (label, fn, fmt) => `<tr><td class="num">${(fmt || (x => x))(fn(a))}</td><td class="mid">${label}</td><td class="num">${(fmt || (x => x))(fn(b))}</td></tr>`;
    const S_ = id => season[id], L_ = id => life[id];
    h += UI.card('Head to head', `<table class="cmp"><thead><tr><th class="num">${UI.badge(a)}</th><th></th><th class="num">${UI.badge(b)}</th></tr></thead><tbody>
      ${cmp('Season record', id => A.rec(S_(id).w, S_(id).l, S_(id).t))}${cmp('All-time record', id => A.rec(L_(id).w, L_(id).l, L_(id).t))}${cmp('Points / game', id => S_(id).gp ? S_(id).pf / S_(id).gp : 0, A.f1)}${cmp('Allowed / game', id => S_(id).gp ? S_(id).pa / S_(id).gp : 0, A.f1)}
      ${cmp('Pass yards / game', id => S_(id).gp ? S_(id).off.passY / S_(id).gp : 0, A.f1)}${cmp('Rush yards / game', id => S_(id).gp ? S_(id).off.rushY / S_(id).gp : 0, A.f1)}${cmp('Takeaways', id => S_(id).takeaways)}${cmp('Giveaways', id => S_(id).giveaways)}
      ${cmp('Roster rating', id => ST().roster(id).reduce((x, p) => x + p.ovr, 0) / Math.max(1, ST().roster(id).length), A.f1)}</tbody></table>`) + `</div>`;
    // meetings
    if (hh.list.length) {
      h += UI.card('Every meeting', UI.table([
        { h: 'Game', v: r => r.season * 100 + r.week, f: r => `<a href="#/game/${r.id}">S${r.season} ${r.type === 'playoff' ? A.LEAGUE.roundNames[r.week] : 'Wk ' + r.week}</a>` },
        { h: 'Home', v: r => r.home, f: r => UI.badge(r.home) }, { h: 'Away', v: r => r.away, f: r => UI.badge(r.away) },
        { h: 'Score', v: r => r.hs + r.as, f: r => `${A.tNick(r.away)} ${r.as}, ${A.tNick(r.home)} ${r.hs}${r.ot ? ' (OT)' : ''}` },
        { h: 'Winner', v: r => A.winnerOf(r) || '', f: r => A.winnerOf(r) ? UI.tlink(A.winnerOf(r), 'nick') : 'Tie' },
      ], hh.list.slice().reverse(), { sortable: false }));
      // top performers across the series
      const ag = A.aggPlayers(hh.list);
      const rows = [...ag.values()].filter(x => ST().P(x.pid)).sort((x, y) => y.impact - x.impact).slice(0, 10);
      h += UI.card('Best players in this series', UI.table([
        { h: 'Player', v: r => ST().P(r.pid).name, f: r => UI.plink(r.pid) + ' ' + UI.badge([...r.teams][0]) }, { h: 'GP', v: r => r.gp, cls: 'num' },
        { h: 'Pass', v: r => r.py, f: r => r.pa ? `${r.pc}/${r.pa}, ${r.py}, ${r.ptd} TD` : '-' }, { h: 'Rush', v: r => r.ry, f: r => r.ra ? `${r.ra} car, ${r.ry}, ${r.rtd} TD` : '-' },
        { h: 'Rec', v: r => r.recy, f: r => r.rec ? `${r.rec} rec, ${r.recy}, ${r.rectd} TD` : '-' }, { h: 'Def', v: r => r.tkl, f: r => (r.tkl || r.sck || r.dint) ? `${r.tkl} tkl, ${r.sck} sck, ${r.dint} INT` : '-' },
      ], rows));
    }
    return h;
  };
  UI.changes.mu = el => {
    const r = UI.parse(); let [a, b] = [r.args[0] || 'MET', r.args[1] || 'WMT'];
    if (el.dataset.w === 'a') a = el.value; else b = el.value;
    location.hash = `#/matchup/${a}/${b}`;
  };

  // ---------- Awards ----------
  UI.views.awards = function (args, q) {
    const s = UI.season, view = q.view || 'season';
    let h = UI.title('Awards', `Season ${s}`);
    h += UI.tabs([['season', 'Season awards'], ['weekly', 'Players of the week'], ['titles', 'Stat titles'], ['all', 'All-ADFL team'], ['champs', 'Champions']], view, v => `#/awards?view=${v}`);
    const slot = (a, extra) => {
      const sel = ST().state.awards.find(x => x.season === s && x.type === a.type && (x.week || 0) === ((extra && extra.week) || 0));
      return `<div class="award ${sel ? 'got' : ''}"><div class="an">${esc(a.name)}</div>
        <div class="aw">${sel ? (sel.pid ? `${UI.plink(sel.pid)} ${sel.pid && ST().P(sel.pid) && ST().P(sel.pid).team ? UI.badge(ST().P(sel.pid).team) : ''}` : UI.tlink(sel.tid)) : '<span class="dim">Not given yet</span>'}</div>
        <button class="sm" data-act="giveAward" data-type="${a.type}" data-pick="${a.pick || 'player'}" data-week="${(extra && extra.week) || ''}">${sel ? 'Change' : 'Give award'}</button></div>`;
    };
    if (view === 'season') {
      h += `<div class="awgrid">${A.SEASONAL.map(a => slot(a)).join('')}</div><div class="note">Tap Give award and the app lists who the stats say deserves it, but you decide.</div>`;
    } else if (view === 'weekly') {
      const weeks = [...new Set(ST().seasonGames(s).filter(g => g.played).map(g => g.week))].sort((a, b) => a - b);
      if (!weeks.length) return h + UI.empty('Play a week first.');
      const wk = q.week ? +q.week : weeks[weeks.length - 1];
      h += UI.tabs(weeks.map(w => [w, w <= A.LEAGUE.regWeeks ? 'Wk ' + w : { 11: 'Semis', 12: 'Conf', 13: 'Final' }[w]]), wk, w => `#/awards?view=weekly&week=${w}`);
      h += `<div class="awgrid">${A.WEEKLY.map(a => slot(a, { week: wk })).join('')}</div>`;
    } else if (view === 'titles') {
      const tw = A.titleWinners(s);
      h += tw.length ? UI.card(`Season ${s} stat titles (regular season)`, `<div class="awgrid">${tw.map(t => `<div class="award got"><div class="an">${t.label}</div><div class="aw">${UI.plink(t.pid)} ${UI.badge(ST().P(t.pid).team || [...t.s.teams][0])}</div><div class="dim">${Number.isInteger(t.v) ? t.v : A.f1(t.v)}</div></div>`).join('')}</div>`) : UI.empty('Stat titles show up once games are recorded.');
    } else if (view === 'all') {
      const al = A.allLeague(s);
      h += al.length ? UI.card(`All-ADFL team / Season ${s}`, `<div class="note">Picked by the stats: best impact per game at each spot (min 3 games).</div>` + UI.table([
        { h: 'POS', v: r => A.POSITIONS.indexOf(r.pos), f: r => r.pos }, { h: 'Player', v: r => ST().P(r.pid).name, f: r => UI.plink(r.pid) }, { h: 'Team', v: r => ST().P(r.pid).team || '', f: r => UI.badge(ST().P(r.pid).team || [...r.s.teams][0]) },
        { h: 'GP', v: r => r.s.gp, cls: 'num' }, { h: 'Impact / game', v: r => r.s.ipg, f: r => A.f1(r.s.ipg), cls: 'num' },
      ], al)) : UI.empty('Needs a few games first.');
    } else {
      const rows = ST().seasons().map(se => ({ se, c: ST().champion(se) })).filter(x => x.c);
      h += rows.length ? UI.card(`Champions / ${A.LEAGUE.trophy}`, UI.table([{ h: 'Season', v: r => r.se, cls: 'num' }, { h: 'Champion', v: r => r.c.team, f: r => UI.tlink(r.c.team) },
        { h: 'Final', v: r => 0, f: r => `<a href="#/game/${r.c.game.id}">${A.tNick(r.c.game.away)} ${r.c.game.as}, ${A.tNick(r.c.game.home)} ${r.c.game.hs}</a>` },
        { h: 'MVP', v: r => '', f: r => { const a = ST().state.awards.find(x => x.season === r.se && x.type === 'CHAMPMVP'); return a ? UI.plink(a.pid) : '<span class="dim">-</span>'; } }], rows)) : UI.empty('No champion crowned yet.');
    }
    return h;
  };

  UI.acts.giveAward = el => {
    const type = el.dataset.type, week = +el.dataset.week || 0, s = UI.season, pick = el.dataset.pick;
    const name = A.awardName(type);
    let body = `<h3>${esc(name)}${week ? ' / Week ' + week : ''}</h3>`;
    if (pick === 'team') {
      body += `<div class="sugg">${A.suggestCoach(s).map(x => `<button class="sg" data-act="setAward" data-type="${type}" data-week="${week}" data-tid="${x.tid}">${UI.badge(x.tid)} ${esc(A.tName(x.tid))} <span class="dim">${A.rec(x.T.w, x.T.l, x.T.t)}</span></button>`).join('')}</div>
        <select id="awSel">${A.TEAMS.map(t => `<option value="${t.id}">${esc(A.tName(t.id))}</option>`).join('')}</select> <button class="gold" data-act="setAwardSel" data-type="${type}" data-week="${week}" data-tid="1">Give</button>`;
    } else {
      const sug = A.suggest(type, s, week || undefined);
      body += sug.length ? `<div class="note">The stats like these players:</div><div class="sugg">${sug.map(x => { const p = ST().P(x.pid); return `<button class="sg" data-act="setAward" data-type="${type}" data-week="${week}" data-pid="${x.pid}">${UI.badge(p.team || [...x.s.teams][0])} <b>${esc(p.name)}</b> <span class="dim">${p.pos} / impact ${A.f1(x.score)}</span></button>`; }).join('')}</div>` : '<div class="note">No stats yet for this award.</div>';
      const ps = Object.values(ST().state.players).filter(p => p.team).sort((a, b) => a.name.localeCompare(b.name));
      body += `<div class="row wrapr"><select id="awSel">${ps.map(p => `<option value="${p.id}">${esc(p.name)} (${A.tNick(p.team)} ${p.pos})</option>`).join('')}</select><button class="gold" data-act="setAwardSel" data-type="${type}" data-week="${week}">Give to this player</button></div>`;
    }
    body += `<div class="row end"><button data-act="clearAward" data-type="${type}" data-week="${week}">Remove award</button></div>`;
    UI.modal(body);
  };
  const setAward = (type, week, who) => { ST().giveAward(Object.assign({ season: UI.season, type, week: week || 0 }, who)); UI.closeModal(); UI.keepScroll = true; UI.render(); UI.toast('Award saved'); };
  UI.acts.setAward = el => setAward(el.dataset.type, +el.dataset.week, el.dataset.pid ? { pid: el.dataset.pid } : { tid: el.dataset.tid });
  UI.acts.setAwardSel = el => { const v = document.getElementById('awSel').value; setAward(el.dataset.type, +el.dataset.week, el.dataset.tid ? { tid: v } : { pid: v }); };
  UI.acts.clearAward = el => { ST().giveAward({ season: UI.season, type: el.dataset.type, week: +el.dataset.week || 0 }); UI.closeModal(); UI.keepScroll = true; UI.render(); };

  // ---------- Picks ----------
  UI.views.picks = function () {
    const sum = A.props.summary(), s = UI.season;
    let h = UI.title('Over / Under picks', 'Just for fun. No money, no coins, only bragging rights.');
    h += `<div class="stats4 card"><div><b>${sum.w}-${sum.l}</b><span>Your record</span></div><div><b>${sum.n ? A.pct(sum.w, sum.n) : '-'}</b><span>Hit rate</span></div><div><b>${sum.cur}</b><span>Current streak</span></div><div><b>${sum.best}</b><span>Best streak</span></div></div>`;
    h += `<div class="cols2">`;
    h += UI.card('Overs vs. unders', `<div class="lrow"><span>Overs</span><b>${sum.sides.over.w}-${sum.sides.over.l}</b></div><div class="lrow"><span>Unders</span><b>${sum.sides.under.w}-${sum.sides.under.l}</b></div>`);
    h += UI.card('By stat', Object.keys(sum.by).length ? Object.entries(sum.by).map(([k, v]) => `<div class="lrow"><span>${esc(k)}</span><b>${v.w}-${v.l}</b></div>`).join('') : '<div class="dim">No graded picks yet</div>');
    h += `</div>`;
    const wk = ST().currentWeek(s);
    if (wk) h += `<h2 class="sec">Make picks / ${A.weekName(wk)}</h2><div class="gwrap">${ST().seasonGames(s).filter(g => g.week === wk && !g.played).map(g => `<a class="gcard" href="#/game/${g.id}"><div class="gt"><span class="gname">${UI.badge(g.away)} ${esc(A.tName(g.away))}</span></div><div class="gt"><span class="gname">${UI.badge(g.home)} ${esc(A.tName(g.home))}</span></div><div class="gfoot"><span class="dim sm">${ST().state.picks.filter(p => p.gameId === g.id).length} pick(s) made</span></div></a>`).join('')}</div>`;
    if (sum.pending.length) h += UI.card('Waiting on the game', sum.pending.map(p => { const g = ST().game(p.gameId); return `<div class="lrow"><span>${p.kind === 'player' ? esc(ST().pName(p.pid)) + ' ' : ''}${esc(p.label)}: <b>${p.side} ${p.line}</b></span><a href="#/game/${g.id}">${A.tNick(g.away)} @ ${A.tNick(g.home)}</a></div>`; }).join(''));
    if (sum.recent.length) h += UI.card('Recent results', sum.recent.map(p => `<div class="lrow"><span>${p.kind === 'player' ? esc(ST().pName(p.pid)) + ' ' : ''}${esc(p.label)}: ${p.side} ${p.line} <span class="dim">(got ${p.actual})</span></span><b class="res ${p.result}">${p.result}</b></div>`).join(''));
    return h;
  };

  // ---------- Records ----------
  UI.views.records = function (args, q) {
    const rb = A.recordBook(played()), view = q.view || 'player';
    let h = UI.title('Record book', 'All-time, across every season');
    h += UI.tabs([['player', 'Player single-game'], ['team', 'Team single-game'], ['season', 'Season records']], view, v => `#/records?view=${v}`);
    const list = rb[view];
    if (!list.length) return h + UI.empty('Records fill in as you save games.');
    h += `<div class="recgrid">` + list.map(r => `<section class="card"><h3>${esc(r.label)}</h3>${r.rows.map((x, i) => `<div class="lrow"><span>${i + 1}. ${x.who ? UI.plink(x.who) + ' ' + UI.badge(x.team) : UI.tlink(x.team, 'nick') + (x.team2 ? ' / ' + A.tNick(x.team2) : '')}${x.opp ? ` <span class="dim">vs ${A.tNick(x.opp)}</span>` : ''}</span><span><b>${x.v}</b> ${x.g ? `<a class="dim" href="#/game/${x.g.id}">S${x.g.season} ${x.g.type === 'playoff' ? 'PO' : 'W' + x.g.week}</a>` : `<span class="dim">Season ${x.season}</span>`}</span></div>`).join('')}</section>`).join('') + `</div>`;
    return h;
  };

  // ---------- Settings ----------
  UI.views.settings = function () {
    const S = ST().state, s = UI.season;
    const played_ = S.games.filter(g => g.played).length;
    const champ = ST().champion(ST().state.seasonNow);
    let h = UI.title('Settings', `${A.LEAGUE.full}`);
    h += UI.card('Your data', `<p>Everything is saved in this browser on this device: ${played_} games, ${Object.keys(S.players).length} players, ${S.picks.length} picks, ${S.awards.length} awards.</p>
      <p class="dim">If you clear your browser data or switch phones, it's gone, so download a backup now and then. The file can be loaded back in here.</p>
      <div class="row wrapr"><button class="gold" data-act="exportData">Download backup</button><label class="btn">Load a backup<input type="file" accept=".json,application/json" data-change="importData" hidden></label>${ST().hasPrev() ? '<button data-act="undoLast">Undo last change</button>' : ''}</div>`);
    h += UI.card('Seasons', `<p>Season ${S.seasonNow} is the current one. ${champ ? `The ${esc(A.tName(champ.team))} won it all.` : 'The season is still going.'}</p>
      <p class="dim">Starting a new season makes a fresh 10-week schedule. The stores-vs-restaurants matchups flip each year, and all stats, records and head-to-head history carry over.</p>
      <div class="row"><button data-act="newSeason">Start Season ${S.seasonNow + 1}</button></div>`);
    h += UI.card('Danger zone', `<p class="dim">This wipes every game, stat and award and brings back fresh rosters.</p><div class="row"><button class="red" data-act="resetAll">Erase everything</button></div>`);
    return h;
  };
  UI.acts.exportData = () => {
    const blob = new Blob([ST().exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `adfl-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    UI.toast('Backup downloaded');
  };
  UI.changes.importData = el => {
    const f = el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { UI.confirm('Replace everything with this backup?', () => { ST().importJSON(r.result); UI.season = ST().state.seasonNow; UI.fillSeasonSel(); UI.render(); UI.toast('Backup loaded'); }, 'Load it'); } catch (e) { UI.toast(e.message); } };
    r.readAsText(f);
  };
  UI.acts.undoLast = () => UI.confirm('Go back to how things were before your last change?', () => { ST().undoLast(); UI.season = ST().state.seasonNow; UI.fillSeasonSel(); UI.render(); UI.toast('Undone'); }, 'Undo');
  UI.acts.newSeason = () => {
    const S = ST().state;
    const unplayed = ST().seasonGames(S.seasonNow).filter(g => !g.played).length;
    UI.confirm(unplayed ? `Season ${S.seasonNow} still has ${unplayed} unplayed games. Start the next season anyway?` : `Start Season ${S.seasonNow + 1}?`, () => { const n = ST().newSeason(); UI.season = n; UI.fillSeasonSel(); UI.go('#/home'); UI.toast('Season ' + n + ' is ready'); }, 'Start');
  };
  UI.acts.resetAll = () => UI.confirm('Erase EVERYTHING and start over?', () => { ST().resetAll(); UI.season = 1; UI.fillSeasonSel(); UI.go('#/home'); UI.toast('Fresh start'); }, 'Erase');
})(globalThis);
