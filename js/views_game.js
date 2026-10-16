// Game page: preview before the game (broadcast notes + over/under picks), box score after.
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const n0 = A.num;

  // ---------- Broadcast notes ----------
  UI.notesCard = function (g, title, incl) {
    const played = ST().state.games.filter(x => x.played && (incl || x.id !== g.id));
    const f = A.broadcastFacts(played, g.home, g.away, g.season);
    const sec = (name, list) => list.length ? `<div class="nsec"><div class="nh">${name}</div><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    return UI.card(title || 'Broadcast notes', sec('The series', f.series) + sec('Form', f.form) + sec('Matchup', f.edges) + sec('Situations', f.splits) + sec('Players in this series', f.players) +
      `<a class="more" href="#/matchup/${g.home}/${g.away}">Full rematch center</a>`, 'notes');
  };

  // ---------- Win chance ----------
  UI.oddsCard = function (g) {
    const o = A.odds.game(g), H = A.team(g.home), Aw = A.team(g.away);
    const pa = Math.round(o.pAway * 100), ph = 100 - pa;
    return UI.card(g.played ? 'Pregame odds' : 'Win chance', `<div class="oddsbar"><div style="width:${pa}%;background:${Aw.c1};border-color:${Aw.c2}">${UI.logo(g.away, 22)}<b>${pa}%</b></div><div style="width:${ph}%;background:${H.c1};border-color:${H.c2}"><b>${ph}%</b>${UI.logo(g.home, 22)}</div></div>
      ${g.played ? '' : `<div class="proj">Projected score: <b>${esc(A.tNick(g.away))} ${o.projAway}, ${esc(A.tNick(g.home))} ${o.projHome}</b></div>`}
      <ul class="why">${o.factors.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="note">${o.games ? `Based on ${o.games} earlier game${o.games > 1 ? 's' : ''} plus roster ratings.` : 'No games played yet, so this is just roster ratings and home field.'} It's a guess, not a sure thing.</div>`, 'odds');
  };

  // ---------- Over/Under picks panel ----------
  UI.propsPanel = function (g) {
    const props = A.props.forGame(g);
    const line = p => {
      const pick = A.props.pickFor(p.id);
      const side = pick && pick.side;
      const who = p.kind === 'player' ? `${UI.plink(p.pid)} ${UI.dim(ST().P(p.pid).pos)}` : esc(p.label);
      const lab = p.kind === 'player' ? p.label : (p.kind === 'total' ? 'Game total' : 'Team points');
      const recent = p.last && p.last.length ? `Last ${p.last.length}: ${p.last.join(', ')}` : '';
      const hr = p.kind === 'player' ? A.props.hitRate(p.pid, p.key, p.line, g) : null;
      const ch = A.odds.prop(pick ? Object.assign({}, p, { line: pick.line }) : p, g);
      return `<div class="prop ${pick ? 'picked' : ''}">
        <div class="pwho"><div>${who}</div><div class="dim sm">${lab}${recent ? ' / ' + recent : ''}${hr ? ` / over in ${hr.over} of last ${hr.n}` : ''}</div></div>
        <div class="pline"><input type="number" step="0.5" class="ln" value="${pick ? pick.line : p.line}" data-pid="${esc(p.id)}" ${pick ? 'disabled' : ''}></div>
        <div class="pbtns">
          <button class="pb ${side === 'over' ? 'on' : ''}" data-act="pick" data-id="${esc(p.id)}" data-g="${g.id}" data-side="over">Over <i>${A.pct0(ch.over)}</i></button>
          <button class="pb ${side === 'under' ? 'on' : ''}" data-act="pick" data-id="${esc(p.id)}" data-g="${g.id}" data-side="under">Under <i>${A.pct0(ch.under)}</i></button>
        </div></div>`;
    };
    const block = (tid) => `<h4>${UI.tlink(tid, 'nick')}</h4>` + props.filter(p => p.tid === tid && p.kind !== 'total').map(line).join('');
    return UI.card('Over / Under picks', `<div class="note">Just for fun: no money, no coins. Pick over or under on each line and the app grades you after the game. Lines come from each player's recent games. The % on each button is the chance it hits, based on past games.</div>` +
      props.filter(p => p.kind === 'total').map(line).join('') + `<div class="cols2">${[g.away, g.home].map(t => `<div>${block(t)}</div>`).join('')}</div>`, 'picks');
  };
  UI.acts.pick = el => {
    const g = ST().game(el.dataset.g);
    const props = A.props.forGame(g);
    const prop = props.find(p => p.id === el.dataset.id);
    const inp = el.closest('.prop').querySelector('.ln');
    A.props.pick(prop, el.dataset.side, inp && inp.value !== '' ? +inp.value : prop.line);
    UI.keepScroll = true; UI.render();
  };

  // ---------- box score helpers ----------
  function perGame(g) { return A.aggPlayers([g]); }
  const GRP = {
    pass: [['C/A', s => `${s.pc}/${s.pa}`, s => s.pa], ['YDS', s => s.py], ['TD', s => s.ptd], ['INT', s => s.pint], ['SCK', s => s.psk], ['Y/A', s => A.f1(s.ypa)], ['RTG', s => A.f1(s.rating)], ['LNG', s => s.plng]],
    rush: [['ATT', s => s.ra], ['YDS', s => s.ry], ['Y/A', s => A.f1(s.ypc)], ['TD', s => s.rtd], ['LNG', s => s.rlng], ['FUM', s => s.fum]],
    rec: [['REC', s => s.rec], ['TGT', s => s.tg], ['YDS', s => s.recy], ['Y/R', s => A.f1(s.ypr)], ['TD', s => s.rectd], ['LNG', s => s.reclng], ['DRP', s => s.drp]],
    def: [['TKL', s => s.tkl], ['TFL', s => s.tfl], ['SCK', s => s.sck], ['INT', s => s.dint], ['PD', s => s.pd], ['FF', s => s.ff], ['FR', s => s.fr], ['TD', s => s.dtd]],
    kick: [['FG', s => `${s.fgm}/${s.fga}`], ['LNG', s => s.fglng], ['XP', s => `${s.xpm}/${s.xpa}`], ['PTS', s => s.fgm * 3 + s.xpm]],
    punt: [['PUNTS', s => s.pn], ['YDS', s => s.pny], ['AVG', s => A.f1(s.ypp)], ['IN20', s => s.pn20], ['LNG', s => s.pnlng]],
    ret: [['KR', s => s.kr], ['YDS', s => s.kry], ['TD', s => s.krtd], ['PR', s => s.pr], ['YDS', s => s.pry], ['TD', s => s.prtd]],
  };
  const sortKey = { pass: 'py', rush: 'ry', rec: 'recy', def: 'tkl', kick: 'fgm', punt: 'pny', ret: 'kry' };

  function groupTable(g, tid, grp, ag) {
    const keys = grp.cols.map(c => c[0]);
    const rows = Object.keys(g.box).filter(pid => g.box[pid].t === tid && keys.some(k => n0(g.box[pid][k]) !== 0)).map(pid => ag.get(pid));
    if (!rows.length) return '';
    rows.sort((a, b) => b[sortKey[grp.id]] - a[sortKey[grp.id]]);
    const def = GRP[grp.id];
    return `<div class="tw"><table class="bs"><thead><tr><th>${grp.title}</th>${def.map(c => `<th class="num">${c[0]}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(s => `<tr><td>${UI.plink(s.pid)} ${UI.dim(ST().P(s.pid) ? ST().P(s.pid).pos : '')}</td>${def.map(c => `<td class="num">${c[1](s)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  UI.pogOf = function (g) {
    if (g.pog && g.box[g.pog]) return { pid: g.pog, manual: true };
    const ag = perGame(g); let best = null;
    ag.forEach((s, pid) => { if (!best || s.impact > best.s.impact) best = { pid, s }; });
    return best ? { pid: best.pid, manual: false } : null;
  };

  UI.views.game = function ([id]) {
    const g = ST().game(id); if (!g) return UI.empty('Game not found.');
    const A_ = g.away, H_ = g.home;
    const head = `<div class="gh">
      <div class="gside">${UI.badge(A_, 'lg')}<div><a class="gtn" href="#/team/${A_}">${esc(A.tName(A_))}</a><div class="dim">${g.played ? '' : 'Away'}</div></div><b class="gbig ${g.played && A.winnerOf(g) !== A_ ? 'lose' : ''}">${g.played ? g.as : ''}</b></div>
      <div class="gmid">${g.type === 'playoff' ? (g.round === 'FINAL' ? A.LEAGUE.champGame : A.LEAGUE.roundNames[g.week]) : 'Week ' + g.week}<br><span class="dim">Season ${g.season}${g.ot ? ' / OT' : ''}</span></div>
      <div class="gside r"><b class="gbig ${g.played && A.winnerOf(g) !== H_ ? 'lose' : ''}">${g.played ? g.hs : ''}</b><div><a class="gtn" href="#/team/${H_}">${esc(A.tName(H_))}</a><div class="dim">${g.played ? '' : 'Home'}</div></div>${UI.badge(H_, 'lg')}</div>
    </div>`;
    const actions = g.played
      ? `<a class="btn gold" href="#/record/${g.id}">Edit stats</a><button data-act="unplay" data-g="${g.id}">Reset game</button>`
      : `<a class="btn gold" href="#/live/${g.id}">Quick Tap (play by play)</a><a class="btn" href="#/record/${g.id}">Type in the box score</a>`;
    let h = `<a class="back" href="#/schedule?week=${g.week}">Back to ${UI.when(g)}</a>` + head + `<div class="row">${actions}</div>`;

    if (!g.played) {
      h += UI.oddsCard(g) + UI.notesCard(g) + UI.propsPanel(g);
      // roster peek
      return h;
    }

    // box score
    const q = (side) => [0, 1, 2, 3].map(i => n0(g.q[side][i])).concat(g.q[side][4] != null ? [n0(g.q[side][4])] : []);
    const hasQ = g.q && !g.q.home.every(v => v == null);
    const ot = g.q.home[4] != null || g.q.away[4] != null;
    if (hasQ) h += UI.card('Score by quarter', `<div class="tw"><table class="bs"><thead><tr><th></th><th class="num">1</th><th class="num">2</th><th class="num">3</th><th class="num">4</th>${ot ? '<th class="num">OT</th>' : ''}<th class="num">T</th></tr></thead><tbody>
      ${[A_, H_].map((t, i) => { const s = i ? 'home' : 'away'; return `<tr><td>${UI.tlink(t, 'nick')}</td>${[0, 1, 2, 3].map(j => `<td class="num">${n0(g.q[s][j])}</td>`).join('')}${ot ? `<td class="num">${n0(g.q[s][4])}</td>` : ''}<td class="num"><b>${i ? g.hs : g.as}</b></td></tr>`; }).join('')}</tbody></table></div>` +
      (g.firstScore ? `<div class="note">${A.tNick(g[g.firstScore])} scored first.</div>` : ''));

    { const o = A.odds.game(g), w = A.winnerOf(g); const pW = w ? (w === g.home ? o.pHome : o.pAway) : null;
      if (pW != null && pW < .38) h += `<div class="upset">UPSET: the ${esc(A.tNick(w))} won with only a ${A.pct0(pW)} chance before kickoff</div>`;
      h += UI.oddsCard(g); }
    // team stats
    const L = { [A_]: A.teamLine(g, A_), [H_]: A.teamLine(g, H_) };
    const cmp = (label, f) => `<tr><td class="num">${f(L[A_], L[H_])}</td><td class="mid">${label}</td><td class="num">${f(L[H_], L[A_])}</td></tr>`;
    const ma = (m, a) => `${m}/${a}${a ? ` (${Math.round(100 * m / a)}%)` : ''}`;
    h += `<div class="cols2">` + UI.card('Team stats', `<table class="cmp"><thead><tr><th class="num">${UI.badge(A_)}</th><th></th><th class="num">${UI.badge(H_)}</th></tr></thead><tbody>
      ${cmp('Total yards', l => l.totY)}${cmp('Passing yards', l => l.py)}${cmp('Rushing yards', l => l.ry)}${cmp('Pass att / comp', l => `${l.pa} / ${l.pc}`)}${cmp('Rushes', l => l.ra)}${cmp('Yards per rush', l => A.f1(A.div0(l.ry, l.ra)))}${cmp('Yards per pass', l => A.f1(A.div0(l.py, l.pa)))}
      ${cmp('First downs', l => l.fd)}${cmp('3rd downs', l => ma(l.thM, l.thA))}${cmp('4th downs', l => ma(l.foM, l.foA))}${cmp('Red zone', l => ma(l.rzM, l.rzA))}
      ${cmp('Penalties', l => `${l.pen}-${l.penY}`)}${cmp('Time of possession', l => A.mmss(l.top))}${cmp('Turnovers', l => l.giveaways)}${cmp('Sacks', l => l.sck)}
      </tbody></table>`) + `<div>${UI.card('Top performers', topPerformers(g))}${UI.notesCard(g, 'Series after this game', true)}</div></div>`;

    const ag = perGame(g);
    [A_, H_].forEach(tid => {
      const tabs = A.GROUPS.map(grp => groupTable(g, tid, grp, ag)).join('');
      h += UI.card(`${UI.tlink(tid)} player stats`, tabs || UI.empty('No player stats saved for this team.'));
    });
    if (g.pbp && g.pbp.length) h += UI.card('Play by play', `<ol class="pbp full">${g.pbp.map(x => { const [q, t, txt] = x.split('|'); return `<li><span class="lq">${q}</span>${t ? UI.logo(t, 16) : ''} ${esc(txt)}</li>`; }).join('')}</ol>`);
    if (g.notes) h += UI.card('Notes', `<p>${esc(g.notes)}</p>`);
    const picks = ST().state.picks.filter(p => p.gameId === g.id);
    if (picks.length) h += UI.card('Your picks this game', picks.map(p => `<div class="lrow"><span>${p.kind === 'player' ? esc(ST().pName(p.pid)) : ''} ${esc(p.label)} ${p.side} ${p.line}</span><b class="res ${p.result}">${p.result || '...'} <span class="dim">(${p.actual == null ? '' : p.actual})</span></b></div>`).join(''));
    return h;
  };

  function topPerformers(g) {
    const ag = perGame(g);
    const pog = UI.pogOf(g);
    const best = (tid, key, sortk, show) => {
      let b = null; ag.forEach((s, pid) => { if (g.box[pid].t === tid && s[sortk] > 0 && (!b || s[sortk] > b.s[sortk])) b = { pid, s }; });
      return b ? `<div class="lrow"><span>${UI.plink(b.pid)}</span><b>${show(b.s)}</b></div>` : '';
    };
    let out = pog ? `<div class="pog"><div class="lh">Player of the game</div><div class="pogn">${UI.plink(pog.pid)}</div><div class="dim">${esc(A.tName(g.box[pog.pid].t))}${pog.manual ? '' : ' / suggested from the stats'}</div></div>` : '';
    for (const tid of [g.away, g.home]) {
      const lines = best(tid, 'pass', 'py', s => `${s.pc}/${s.pa}, ${s.py} yds, ${s.ptd} TD${s.pint ? ', ' + s.pint + ' INT' : ''}`) +
        best(tid, 'rush', 'ry', s => `${s.ra} car, ${s.ry} yds${s.rtd ? ', ' + s.rtd + ' TD' : ''}`) +
        best(tid, 'rec', 'recy', s => `${s.rec} rec, ${s.recy} yds${s.rectd ? ', ' + s.rectd + ' TD' : ''}`) +
        best(tid, 'def', 'tkl', s => `${s.tkl} tkl${s.sck ? ', ' + s.sck + ' sck' : ''}${s.dint ? ', ' + s.dint + ' INT' : ''}`);
      if (lines) out += `<div class="lh">${esc(A.tNick(tid))}</div>` + lines;
    }
    return out;
  }

  UI.acts.unplay = el => {
    const g = ST().game(el.dataset.g);
    if (ST().lockedByPlayoffs(g)) return UI.toast('Later playoff rounds are already set. Reset those first.');
    UI.confirm('Reset this game back to unplayed? Its stats will be removed.', () => { ST().unplay(g); UI.render(); UI.toast('Game reset'); }, 'Reset');
  };
})(globalThis);
