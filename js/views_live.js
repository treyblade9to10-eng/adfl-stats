// Quick Tap: record a game play by play with big buttons. The app tracks down, distance, ball spot and score,
// and builds the whole box score from the taps. Undo any time. "Finish" goes to the normal form to review + save.
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const OPP = s => s === 'home' ? 'away' : 'home';
  let cur = null;     // { g, d }
  let step = null;    // play being built: { k, stage, ...fields }

  const L = () => cur.d.live;
  const tid = side => cur.g[side];
  const nick = side => A.tNick(tid(side));
  const P = id => ST().P(id);
  const last = id => { const p = P(id); return p ? p.name.split(' ').slice(1).join(' ') || p.name : '?'; };
  const pn = id => { const p = P(id); return p ? `#${p.num} ${p.name}` : 'someone'; };

  function roster(side, poss) {
    const order = poss || ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
    return ST().roster(tid(side)).filter(p => order.includes(p.pos)).sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr);
  }
  const OFF_SKILL = ['WR', 'TE', 'RB', 'QB'], RUNNERS = ['RB', 'QB', 'WR', 'TE'], DEF = ['LB', 'S', 'CB', 'DL'], RET = ['WR', 'RB', 'CB', 'S'];

  function init(g, d) {
    if (!d.plays) d.plays = [];
    if (!d.live) {
      const qb = s => (roster(s, ['QB'])[0] || {}).id || null;
      d.live = { qtr: 1, poss: null, down: 1, togo: 10, ball: 25, phase: 'start', drive: 0, kick: null, firstRecv: null, qb: { home: qb('home'), away: qb('away') } };
    }
  }

  // ---------- game state moves ----------
  const snap = () => { const l = L(); return { qtr: l.qtr, poss: l.poss, down: l.down, togo: l.togo, ball: l.ball, phase: l.phase, drive: l.drive, kick: l.kick ? Object.assign({}, l.kick) : null, qb: Object.assign({}, l.qb) }; };
  function setBall(side, ball) { const l = L(); if (side !== l.poss) l.drive++; l.poss = side; l.ball = Math.max(1, Math.min(99, ball)); l.down = 1; l.togo = Math.min(10, 100 - l.ball); l.phase = 'play'; }
  function goKickoff(kicking) { const l = L(); l.phase = 'kickoff'; l.kick = { by: kicking, to: OPP(kicking) }; }
  function score(play, side, n) { play.score = [side, n]; }

  // offense ran a play from scrimmage and gained y (negative = loss)
  function afterSnap(play, y) {
    const l = L(), off = l.poss;
    if (l.ball + y >= 100 || play.td) { play.td = true; play.y = 100 - l.ball; score(play, off, 6); l.phase = 'pat'; return; }
    if (l.ball + y <= 0) { play.safety = true; score(play, OPP(off), 2); goKickoff(off); return; }
    l.ball += y; l.togo -= y;
    if (l.togo <= 0) { play.fd = true; l.down = 1; l.togo = Math.min(10, 100 - l.ball); return; }
    l.down++;
    if (l.down > 4) { play.tod = true; setBall(OPP(off), 100 - l.ball); }
  }

  function apply(play) {
    const l = L(), off = l.poss;
    play.q = l.qtr; play.off = off; play.drive = l.drive;
    switch (play.k) {
      case 'start': l.firstRecv = play.recv; goKickoff(OPP(play.recv)); break;
      case 'comp': play.qb = l.qb[off]; afterSnap(play, play.y); break;
      case 'inc': play.qb = l.qb[off]; afterSnap(play, 0); break;
      case 'run': afterSnap(play, play.y); break;
      case 'sack': play.qb = l.qb[off]; afterSnap(play, -Math.abs(play.y)); break;
      case 'int': {
        play.qb = l.qb[off];
        const spot = 100 - l.ball + (play.ret || 0);
        if (play.td || spot >= 100) { play.td = true; score(play, OPP(off), 6); l.poss = OPP(off); l.drive++; l.phase = 'pat'; }
        else setBall(OPP(off), spot);
        break;
      }
      case 'fum': setBall(OPP(off), 100 - l.ball); break;
      case 'fg': {
        play.dist = 100 - l.ball + 17;
        if (play.good) { score(play, off, 3); goKickoff(off); } else setBall(OPP(off), 100 - l.ball);
        break;
      }
      case 'punt': {
        const land = l.ball + play.y;
        if (land >= 100) { play.tb = true; setBall(OPP(off), 20); }
        else { play.in20 = land >= 80; const spot = 100 - land + (play.ret || 0); if (play.rtd || spot >= 100) { play.rtd = true; score(play, OPP(off), 6); l.poss = OPP(off); l.drive++; l.phase = 'pat'; } else setBall(OPP(off), spot); }
        break;
      }
      case 'pen': {
        const y = play.on === off ? -play.y : play.y;
        l.ball = Math.max(1, Math.min(99, l.ball + y)); l.togo -= y;
        if (l.togo <= 0 || play.auto) { play.fd = true; l.down = 1; l.togo = Math.min(10, 100 - l.ball); }
        break;
      }
      case 'pat': {
        if (play.two) { if (play.good) score(play, off, 2); } else if (play.good) score(play, off, 1);
        goKickoff(off); break;
      }
      case 'safety': score(play, OPP(off), 2); goKickoff(off); break;
      case 'tod': setBall(OPP(off), 100 - l.ball); break;
      case 'ko': {
        const k = l.kick; play.off = k.to;
        if (!play.tb) play.ret = play.td ? 100 : play.spot;   // returns usually start around the goal line
        if (play.tb) setBall(k.to, 25);
        else if (play.td) { score(play, k.to, 6); l.poss = k.to; l.drive++; l.phase = 'pat'; }
        else setBall(k.to, play.spot);
        break;
      }
      case 'qtr': {
        l.qtr++;
        if (l.qtr === 3 || l.qtr === 5) goKickoff(l.qtr === 3 && l.firstRecv ? l.firstRecv : OPP(l.poss || 'away'));
        break;
      }
      case 'swap': setBall(OPP(off), 100 - l.ball); break;
      case 'spot': l.ball = play.ball; l.down = play.down; l.togo = play.togo; break;
    }
  }

  // ---------- build the box score from the plays ----------
  function derive(g, plays) {
    const box = {}, team = { home: {}, away: {} }, q = { home: [0, 0, 0, 0, null], away: [0, 0, 0, 0, null] };
    const ln = (pid, side) => { if (!pid) return null; if (!box[pid]) box[pid] = { t: g[side] }; return box[pid]; };
    const add = (o, k, v) => { if (o) o[k] = (o[k] || 0) + (v == null ? 1 : v); };
    const mx = (o, k, v) => { if (o) o[k] = Math.max(o[k] || 0, v); };
    const T = (side, k, v) => add(team[side], k, v);
    const rz = {};
    let first = null;
    for (const p of plays) {
      const off = p.off, def = OPP(off || 'home');
      const b = p.before || {};
      const isSnap = ['comp', 'inc', 'run', 'sack', 'int'].includes(p.k);
      if (isSnap && off) {
        if (b.down === 3) { T(off, 'thA'); if (p.fd || (p.td && p.k !== 'int')) T(off, 'thM'); }
        if (b.down === 4) { T(off, 'foA'); if (p.fd || (p.td && p.k !== 'int')) T(off, 'foM'); }
        if (p.fd) T(off, 'fd');
        if (b.ball >= 80) { const key = off + p.drive; if (!rz[key]) { rz[key] = 1; T(off, 'rzA'); } }
        if (p.td && p.k !== 'int' && b.ball >= 80) T(off, 'rzM');
        else if (p.td && p.k !== 'int' && rz[off + p.drive] === 1) { /* scored from outside after an earlier red zone snap */ rz[off + p.drive] = 2; T(off, 'rzM'); }
      }
      switch (p.k) {
        case 'comp': { const qb = ln(p.qb, off), r = ln(p.r, off); add(qb, 'pa'); add(qb, 'pc'); add(qb, 'py', p.y); mx(qb, 'plng', p.y); add(r, 'tg'); add(r, 'rec'); add(r, 'recy', p.y); mx(r, 'reclng', p.y);
          if (p.td) { add(qb, 'ptd'); add(r, 'rectd'); } if (p.d) add(ln(p.d, def), 'tkl'); break; }
        case 'inc': { add(ln(p.qb, off), 'pa'); if (p.r) add(ln(p.r, off), 'tg'); if (p.drop && p.r) add(ln(p.r, off), 'drp'); if (p.d) add(ln(p.d, def), 'pd'); break; }
        case 'run': { const r = ln(p.r, off); add(r, 'ra'); add(r, 'ry', p.y); mx(r, 'rlng', p.y); if (p.td) add(r, 'rtd'); if (p.d) { const t = ln(p.d, def); add(t, 'tkl'); if (p.y < 0) add(t, 'tfl'); } break; }
        case 'sack': { add(ln(p.qb, off), 'psk'); const t = ln(p.d, def); add(t, 'sck'); add(t, 'tkl'); add(t, 'tfl'); break; }
        case 'int': { const qb = ln(p.qb, off); add(qb, 'pa'); add(qb, 'pint'); const t = ln(p.d, def); add(t, 'dint'); if (p.td) add(t, 'dtd'); break; }
        case 'fum': { add(ln(p.r, off), 'fum'); if (p.f) add(ln(p.f, def), 'ff'); add(ln(p.d, def), 'fr'); break; }
        case 'fg': { const k = ln(p.r, off); add(k, 'fga'); if (p.good) { add(k, 'fgm'); mx(k, 'fglng', p.dist); } break; }
        case 'punt': { const k = ln(p.r, off); add(k, 'pn'); add(k, 'pny', p.y); mx(k, 'pnlng', p.y); if (p.in20) add(k, 'pn20'); if (p.ret != null && p.d) { const r = ln(p.d, def); add(r, 'pr'); add(r, 'pry', p.ret || 0); if (p.rtd) add(r, 'prtd'); } break; }
        case 'pat': { if (p.two) { if (p.good) T(off, 'tp'); } else { const k = ln(p.r, off); add(k, 'xpa'); if (p.good) add(k, 'xpm'); } break; }
        case 'pen': { T(p.on, 'pen'); T(p.on, 'penY', p.y); break; }
        case 'ko': { if (!p.tb && p.r) { const r = ln(p.r, p.off); add(r, 'kr'); add(r, 'kry', p.ret || 0); if (p.td) add(r, 'krtd'); } break; }
      }
      if (p.safety || p.k === 'safety') T(p.score[0], 'saf');
      if (p.score) { const [side, n] = p.score; const qi = Math.min(5, p.q) - 1; q[side][qi] = (q[side][qi] || 0) + n; if (qi === 4) q[OPP(side)][4] = q[OPP(side)][4] || 0; if (!first) first = side; }
    }
    if (plays.some(p => p.q >= 5)) { q.home[4] = q.home[4] || 0; q.away[4] = q.away[4] || 0; }
    return { box, team, q, first };
  }

  function recompute() {
    const d = cur.d, r = derive(cur.g, d.plays);
    d.box = r.box; d.q = r.q; d.firstScore = r.first || '';
    for (const s of ['home', 'away']) {
      const keepTop = d.team[s] && d.team[s].top;
      d.team[s] = Object.assign({ fd: 0, thM: 0, thA: 0, foM: 0, foA: 0, rzM: 0, rzA: 0, pen: 0, penY: 0, tp: 0, saf: 0 }, r.team[s]);
      if (keepTop) d.team[s].top = keepTop;
    }
    d.ot = r.q.home[4] != null;
    ST().saveDraft(cur.g, d);
  }

  function commit(play) {
    play.before = snap();
    apply(play);
    cur.d.plays.push(play);
    recompute();
    step = null; UI.keepScroll = true; UI.render();
  }

  // ---------- text for the play log ----------
  function describe(p) {
    const o = p.off ? nick(p.off) : '';
    switch (p.k) {
      case 'start': return `${nick(p.recv)} get the ball first`;
      case 'comp': return `${last(p.qb)} to ${last(p.r)}, ${p.y} yds${p.td ? ', TOUCHDOWN' : ''}${p.fd ? ', 1st down' : ''}${p.d ? ` (${last(p.d)})` : ''}`;
      case 'inc': return `${last(p.qb)} incomplete${p.r ? ' to ' + last(p.r) : ''}${p.drop ? ', dropped' : ''}${p.d ? `, broken up by ${last(p.d)}` : ''}`;
      case 'run': return `${last(p.r)} run, ${p.y} yds${p.td ? ', TOUCHDOWN' : ''}${p.fd ? ', 1st down' : ''}${p.d ? ` (${last(p.d)})` : ''}`;
      case 'sack': return `${last(p.qb)} sacked by ${last(p.d)} for -${Math.abs(p.y)}${p.safety ? ', SAFETY' : ''}`;
      case 'int': return `${last(p.qb)} INTERCEPTED by ${last(p.d)}${p.td ? ', returned for a TOUCHDOWN' : p.ret ? `, ${p.ret}-yd return` : ''}`;
      case 'fum': return `${last(p.r)} FUMBLE, recovered by ${last(p.d)}${p.f ? ` (forced by ${last(p.f)})` : ''}`;
      case 'fg': return `${last(p.r)} ${p.dist}-yd field goal ${p.good ? 'GOOD' : 'no good'}`;
      case 'punt': return `${last(p.r)} punts ${p.y} yds${p.tb ? ', touchback' : p.in20 ? ', inside the 20' : ''}${p.d && p.ret != null ? `, ${last(p.d)} returns ${p.ret}${p.rtd ? ' for a TOUCHDOWN' : ''}` : ''}`;
      case 'pat': return p.two ? `2-point try ${p.good ? 'GOOD' : 'failed'}` : `${last(p.r)} extra point ${p.good ? 'good' : 'missed'}`;
      case 'pen': return `Penalty on ${nick(p.on)}, ${p.y} yds${p.auto ? ', automatic 1st down' : ''}`;
      case 'safety': return `SAFETY`;
      case 'tod': return `${o} turn it over on downs`;
      case 'ko': return p.tb ? `Kickoff, touchback` : `${last(p.r)} kick return${p.td ? ' for a TOUCHDOWN' : ` to the ${p.spot}`}`;
      case 'qtr': return p.before && p.before.qtr === 4 ? 'End of regulation' : `End of quarter ${p.before ? p.before.qtr : ''}`;
      case 'swap': return `Ball goes to ${nick(OPP(p.off))}`;
      case 'spot': return `Spot fixed: ${A.ord(p.down)} & ${p.togo} at the ${spotText(p.ball)}`;
    }
    return p.k;
  }
  const spotText = b => b === 50 ? '50' : b < 50 ? 'own ' + b : 'opp ' + (100 - b);

  // ---------- screens ----------
  const btn = (act, label, cls, data) => `<button class="tap ${cls || ''}" data-act="lv" data-do="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${label}</button>`;
  function playerGrid(side, positions, field, extra) {
    const t = A.team(tid(side));
    return `<div class="pgrid" style="--c1:${t.c1};--c2:${t.c2}">${roster(side, positions).map(p => btn('pick', `<b>#${p.num}</b><span>${esc(last(p.id))}</span><i>${p.pos}</i>`, 'pbt', { f: field, v: p.id })).join('')}${extra || ''}</div>`;
  }
  function yardPad(field, opts) {
    const l = L(), maxY = 100 - l.ball;
    const list = opts && opts.list || [-5, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50];
    return `<div class="ypad">${list.filter(y => !opts || !opts.max || y <= opts.max).map(y => btn('yd', (y > 0 && !(opts && opts.plain) ? '+' : '') + y, y < 0 ? 'neg' : '', { f: field, v: y })).join('')}
      ${opts && opts.noTd ? '' : btn('yd', `TD (${maxY})`, 'td', { f: field, v: maxY, td: 1 })}</div>
      <div class="row"><input type="number" id="ycust" inputmode="numeric" placeholder="Other"><button data-act="lv" data-do="ycust" data-f="${field}">Use</button></div>`;
  }

  // which question to ask next for the play being built
  function nextQuestion() {
    const l = L(), off = l.poss, def = OPP(off || 'home'), s = step;
    const need = (f) => s[f] === undefined;
    switch (s.k) {
      case 'comp':
        if (need('r')) return ['Who caught it?', playerGrid(off, OFF_SKILL, 'r')];
        if (need('y')) return [`${last(s.r)} caught it. How many yards?`, yardPad('y')];
        if (need('d') && !(l.ball + s.y >= 100)) return ['Who made the tackle?', playerGrid(def, DEF, 'd', btn('pick', 'No tackle / out of bounds', 'wide', { f: 'd', v: '' }))];
        return null;
      case 'inc':
        if (need('r')) return ['Who was it thrown to?', playerGrid(off, OFF_SKILL, 'r', btn('pick', 'Nobody / thrown away', 'wide', { f: 'r', v: '' }))];
        if (need('d')) return ['Broken up by? (or dropped)', playerGrid(def, ['CB', 'S', 'LB', 'DL'], 'd', btn('pick', 'Nobody, just missed', 'wide', { f: 'd', v: '' }) + (s.r ? btn('pick', 'He DROPPED it', 'wide neg', { f: 'd', v: '', drop: 1 }) : ''))];
        return null;
      case 'run':
        if (need('r')) return ['Who ran it?', playerGrid(off, RUNNERS, 'r')];
        if (need('y')) return [`${last(s.r)} run. How many yards?`, yardPad('y')];
        if (need('d') && !(l.ball + s.y >= 100)) return ['Who made the tackle?', playerGrid(def, DEF, 'd', btn('pick', 'No tackle / out of bounds', 'wide', { f: 'd', v: '' }))];
        return null;
      case 'sack':
        if (need('d')) return ['Who got the sack?', playerGrid(def, ['DL', 'LB', 'S', 'CB'], 'd')];
        if (need('y')) return ['Yards lost?', yardPad('y', { list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15], noTd: true, plain: true })];
        return null;
      case 'int':
        if (need('d')) return ['Who picked it off?', playerGrid(def, ['CB', 'S', 'LB', 'DL'], 'd')];
        if (need('ret')) return [`${last(s.d)} picked it. Return yards?`, `<div class="ypad">${[0, 5, 10, 15, 20, 25, 30, 40, 50].map(y => btn('yd', y, '', { f: 'ret', v: y })).join('')}${btn('yd', 'Pick six!', 'td', { f: 'ret', v: 0, td: 1 })}</div>`];
        return null;
      case 'fum':
        if (need('r')) return ['Who fumbled?', playerGrid(off, RUNNERS, 'r')];
        if (need('f')) return ['Who forced it?', playerGrid(def, DEF, 'f', btn('pick', 'Nobody / not sure', 'wide', { f: 'f', v: '' }))];
        if (need('d')) return ['Who recovered it?', playerGrid(def, DEF, 'd')];
        return null;
      case 'fg':
        if (need('good')) return [`${100 - l.ball + 17}-yard field goal by ${last(s.r)}`, `<div class="bigrow">${btn('set', 'GOOD', 'go', { f: 'good', v: 1 })}${btn('set', 'NO GOOD', 'neg', { f: 'good', v: 0 })}</div>`];
        return null;
      case 'punt':
        if (need('y')) return [`${last(s.r)} punts. How far?`, yardPad('y', { list: [20, 25, 30, 35, 38, 40, 42, 45, 48, 50, 55, 60, 65], noTd: true, plain: true })];
        if (need('d') && l.ball + s.y < 100) return ['Who returned it?', playerGrid(def, RET, 'd', btn('pick', 'Fair catch / no return', 'wide', { f: 'd', v: '' }))];
        if (s.d && need('ret')) return [`${last(s.d)} return yards?`, `<div class="ypad">${[0, 3, 5, 8, 10, 15, 20, 30, 40].map(y => btn('yd', y, '', { f: 'ret', v: y })).join('')}${btn('yd', 'Returned for a TD', 'td', { f: 'ret', v: 0, rtd: 1 })}</div>`];
        return null;
      case 'pen':
        if (need('on')) return ['Penalty on who?', `<div class="bigrow">${btn('set', 'Offense (' + esc(nick(off)) + ')', '', { f: 'on', v: off })}${btn('set', 'Defense (' + esc(nick(def)) + ')', '', { f: 'on', v: def })}</div>`];
        if (need('y')) return ['How many yards?', `<div class="ypad">${[5, 10, 15].map(y => btn('yd', y, '', { f: 'y', v: y })).join('')}${s.on === def ? btn('yd', '15 + auto 1st down', '', { f: 'y', v: 15, auto: 1 }) : ''}</div>`];
        return null;
      case 'ko':
        if (need('tb')) return [`${nick(l.kick.by)} kick off to the ${nick(l.kick.to)}`, `<div class="bigrow">${btn('set', 'Touchback (25)', 'go', { f: 'tb', v: 1 })}${btn('set', 'Kick return', '', { f: 'tb', v: 0 })}</div>`];
        if (s.tb) return null;
        if (need('r')) return ['Who returned it?', playerGrid(l.kick.to, RET, 'r')];
        if (need('spot')) return [`${last(s.r)} brought it out to his own...`, `<div class="ypad">${[10, 15, 20, 25, 30, 35, 40, 45, 50, 60].map(y => btn('yd', y, '', { f: 'spot', v: y })).join('')}${btn('yd', 'TD!', 'td', { f: 'spot', v: 100, ktd: 1 })}</div>`];
        return null;
    }
    return null;
  }

  function mainPad() {
    const l = L();
    if (l.phase === 'start') return `<h3>Who gets the ball first?</h3><div class="bigrow">${['away', 'home'].map(s => btn('start', `${UI.logo(tid(s), 34)} ${esc(A.tName(tid(s)))}`, '', { side: s })).join('')}</div>`;
    if (l.phase === 'kickoff') { step = { k: 'ko' }; return question(); }
    if (l.phase === 'pat') {
      const k = roster(l.poss, ['K'])[0];
      return `<h3>${esc(nick(l.poss))} touchdown! Extra point?</h3><div class="bigrow">${btn('quick', 'XP good', 'go', { k: 'pat', good: 1, r: k ? k.id : '' })}${btn('quick', 'XP missed', 'neg', { k: 'pat', good: 0, r: k ? k.id : '' })}</div>
        <div class="bigrow">${btn('quick', '2-pt good', '', { k: 'pat', two: 1, good: 1 })}${btn('quick', '2-pt failed', '', { k: 'pat', two: 1, good: 0 })}</div>`;
    }
    const kicker = roster(l.poss, ['K'])[0], punter = roster(l.poss, ['P'])[0] || kicker;
    return `<div class="mainpad">
      ${btn('begin', 'COMPLETE', 'go big', { k: 'comp' })}${btn('begin', 'INCOMPLETE', 'big', { k: 'inc' })}
      ${btn('begin', 'RUN', 'go big', { k: 'run' })}${btn('begin', 'SACK', 'neg', { k: 'sack' })}
      ${btn('begin', 'INTERCEPTION', 'neg', { k: 'int' })}${btn('begin', 'FUMBLE LOST', 'neg', { k: 'fum' })}
      ${btn('begin', 'PUNT', '', { k: 'punt', r: punter ? punter.id : '' })}${btn('begin', 'FIELD GOAL', '', { k: 'fg', r: kicker ? kicker.id : '' })}
      ${btn('begin', 'PENALTY', 'flag', { k: 'pen' })}${btn('more', 'More...', '')}
    </div>`;
  }
  function question() {
    const q = nextQuestion();
    if (!q) return '';
    return `<h3>${esc(q[0])}</h3>${q[1]}<div class="row">${btn('cancel', 'Cancel this play', 'sm')}</div>`;
  }

  UI.views.live = function ([id]) {
    const g = ST().game(id); if (!g) return UI.empty('Game not found.');
    if (A.sync && A.sync.viewOnly()) return UI.card('View only', '<p>Only the league owner can record games. Sign in from Settings if that is you.</p>');
    if (g.played && ST().lockedByPlayoffs(g)) return UI.card('Locked', '<p>The next playoff round was already built from this game.</p>');
    if (!cur || cur.g.id !== id || UI.fromRoute !== UI.curRoute) { cur = { g, d: ST().draftFor(g), started: cur && cur.g.id === id && cur.started }; step = null; UI._lvMore = false; }
    init(g, cur.d);
    if (g.played && !cur.d.plays.length && !cur.started) return `<a class="back" href="#/game/${id}">Back</a>` + UI.card('This game already has stats', '<p>Quick Tap would replace the saved box score with a new one built from taps.</p><div class="row"><button class="gold" data-act="lv" data-do="restart">Start over with Quick Tap</button><a class="btn" href="#/record/' + id + '">Edit the box score instead</a></div>');
    const l = L(), d = cur.d;
    const hs = A.sumQ(d.q.home), as = A.sumQ(d.q.away);
    const T = s => A.team(tid(s));
    const side = s => `<div class="lvteam ${l.poss === s ? 'has' : ''}" style="--c1:${T(s).c1};--c2:${T(s).c2}">${UI.logo(tid(s), 30)}<span>${esc(nick(s))}</span><b>${s === 'home' ? hs : as}</b></div>`;
    const sit = l.phase === 'play' ? `${A.ord(l.down)} & ${l.ball + l.togo >= 100 ? 'Goal' : l.togo} at the ${spotText(l.ball)}` : l.phase === 'pat' ? 'Try for the extra point' : l.phase === 'kickoff' ? 'Kickoff' : 'Coin toss';
    const qb = l.poss && l.phase === 'play' ? `<span class="dim">QB: ${esc(last(l.qb[l.poss]))}</span> <button class="sm" data-act="lv" data-do="qb">Change</button>` : '';
    let body = step ? question() : mainPad();
    if (!cur.d.plays) return '';
    if (step === null && UI._lvMore) { body = `<h3>More</h3><div class="mainpad">${btn('quick', 'SAFETY', 'neg', { k: 'safety' })}${btn('quick', 'TURNOVER ON DOWNS', '', { k: 'tod' })}${btn('quick', 'BALL TO OTHER TEAM', '', { k: 'swap' })}${btn('spotfix', 'FIX DOWN / SPOT', '')}${btn('lessen', 'Back', 'sm')}</div>`; }
    const log = d.plays.slice().reverse().slice(0, 12).map(p => `<li><span class="lq">Q${Math.min(p.q || 1, 5) === 5 ? 'OT' : p.q}</span>${p.off ? UI.logo(tid(p.off), 16) : ''} ${esc(describe(p))}</li>`).join('');
    return `<div class="lv">
      <div class="lvtop">${side('away')}<div class="lvmid"><b>${l.qtr >= 5 ? 'OT' : 'Q' + l.qtr}</b><div>${esc(sit)}</div></div>${side('home')}</div>
      <div class="row lvbar"><button data-act="lv" data-do="undo" ${d.plays.length ? '' : 'disabled'}>Undo</button>${l.phase === 'play' || l.phase === 'kickoff' ? `<button data-act="lv" data-do="qtr">End ${l.qtr === 4 ? 'regulation' : l.qtr >= 5 ? 'OT' : 'Q' + l.qtr}</button>` : ''}<span class="grow"></span>${qb}<a class="btn gold" href="#/record/${g.id}">Finish + review</a></div>
      <div class="lvpad">${body}</div>
      ${log ? `<div class="card"><h3>Play by play</h3><ol class="pbp">${log}</ol>${d.plays.length > 12 ? `<div class="note">${d.plays.length} plays so far</div>` : ''}</div>` : ''}
      <div class="note">Every tap saves as you go. The box score, first downs, 3rd downs, red zone and score are all built from these taps.</div>
    </div>`;
  };

  UI.acts.lv = (el) => {
    const a = el.dataset.do, ds = el.dataset;
    const rerender = () => { if (step && !nextQuestion()) { const s = step; step = null; return commit(s); } UI.keepScroll = true; UI.render(); };
    if (a === 'start') return commit({ k: 'start', recv: ds.side });
    if (a === 'begin') { step = { k: ds.k }; if (ds.r !== undefined) step.r = ds.r || null; UI._lvMore = false; return rerender(); }
    if (a === 'quick') { const p = { k: ds.k }; ['good', 'two'].forEach(f => { if (ds[f] !== undefined) p[f] = ds[f] === '1'; }); if (ds.r !== undefined) p.r = ds.r || null; UI._lvMore = false; return commit(p); }
    if (a === 'pick') { step[ds.f] = ds.v || null; if (ds.drop) step.drop = true; return rerender(); }
    if (a === 'set') { const v = ds.v; step[ds.f] = /^[01]$/.test(v) ? v === '1' : v; return rerender(); }
    if (a === 'yd') { step[ds.f] = +ds.v; if (ds.td) step.td = true; if (ds.rtd) step.rtd = true; if (ds.auto) step.auto = true; if (ds.ktd) step.td = true; return rerender(); }
    if (a === 'ycust') { const v = document.getElementById('ycust').value; if (v === '' || isNaN(+v)) return UI.toast('Type a number'); step[ds.f] = Math.round(+v); return rerender(); }
    if (a === 'cancel') { step = null; if (L().phase === 'kickoff') { /* kickoff must still happen */ } return rerender(); }
    if (a === 'more') { UI._lvMore = true; return rerender(); }
    if (a === 'lessen') { UI._lvMore = false; return rerender(); }
    if (a === 'undo') {
      const p = cur.d.plays.pop(); if (!p) return;
      if (p.before) Object.assign(cur.d.live, p.before);
      if (p.k === 'start') cur.d.live.phase = 'start';
      step = null; recompute(); UI.toast('Undid: ' + describe(p)); return rerender();
    }
    if (a === 'qtr') { step = null; const q = L().qtr; return UI.confirm(q === 4 ? 'End regulation? (If it is tied you go to overtime.)' : `End quarter ${q >= 5 ? 'OT' : q}?`, () => commit({ k: 'qtr' }), 'End it'); }
    if (a === 'qb') {
      const l = L(); const m = UI.modal(`<h3>Who is playing QB for the ${esc(nick(l.poss))}?</h3>${playerGrid(l.poss, ['QB', 'RB', 'WR', 'TE'], 'qb')}`, 'small');
      m.querySelectorAll('[data-do="pick"]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); l.qb[l.poss] = b.dataset.v; ST().saveDraft(cur.g, cur.d); UI.closeModal(); rerender(); }, true));
      return;
    }
    if (a === 'spotfix') {
      const l = L();
      const m = UI.modal(`<h3>Fix the down and spot</h3><div class="row wrapr"><label class="inl">Down<select id="fxd">${[1, 2, 3, 4].map(n => `<option ${n === l.down ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="inl">Yards to go<input id="fxt" type="number" value="${l.togo}" style="width:80px"></label>
        <label class="inl">Ball on<select id="fxs"><option value="own">Own</option><option value="opp" ${l.ball > 50 ? 'selected' : ''}>Opponent</option></select></label>
        <label class="inl">Yard line<input id="fxb" type="number" value="${l.ball > 50 ? 100 - l.ball : l.ball}" style="width:80px"></label></div>
        <div class="row end"><button class="gold" id="fxok">Save</button></div>`, 'small');
      m.querySelector('#fxok').onclick = () => {
        const yl = Math.max(1, Math.min(50, +m.querySelector('#fxb').value || 25)); const ball = m.querySelector('#fxs').value === 'opp' ? 100 - yl : yl;
        UI.closeModal(); UI._lvMore = false; commit({ k: 'spot', ball, down: +m.querySelector('#fxd').value, togo: Math.max(1, +m.querySelector('#fxt').value || 10) });
      };
      return;
    }
    if (a === 'restart') { cur.started = true; cur.d = ST().newDraft(cur.g); cur.d.plays = []; init(cur.g, cur.d); ST().saveDraft(cur.g, cur.d); return rerender(); }
  };
  // Test hook: lets the automated tests drive a game without clicking.
  A.liveTest = { derive, describe };
  // Turn the plays into short play-by-play lines that get saved with the game ("Q1|MET|text").
  A.pbpLines = function (g, plays) {
    const keep = cur; cur = { g, d: null };
    try { return plays.filter(p => p.k !== 'spot').map(p => `${p.q >= 5 ? 'OT' : 'Q' + p.q}|${p.off ? g[p.off] : ''}|${describe(p)}`); } finally { cur = keep; }
  };
})(globalThis);
