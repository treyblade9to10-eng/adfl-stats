const { A, fillGame } = require('./helpers.js');
A.store.load();
const S = A.store.state;
console.log('players', Object.keys(S.players).length, 'games', S.games.length);
// pick a few props first
const g1 = S.games.find(g => g.week === 1);
const props = A.props.forGame(g1);
console.log('props for game 1:', props.length, props.slice(0, 3).map(p => p.label + ' ' + p.line).join(' | '));
A.props.pick(props[0], 'over'); A.props.pick(props[1], 'under'); A.props.pick(props.find(p => p.kind === 'total'), 'over');
for (let w = 1; w <= 10; w++) S.games.filter(g => g.season === 1 && g.week === w).forEach(g => { const r = fillGame(g); if (!r.ok) throw new Error(r.error); });
console.log('after reg: games', S.games.length, 'playoff', S.games.filter(g => g.type === 'playoff').length);
for (const wk of [11, 12, 13]) { S.games.filter(g => g.season === 1 && g.week === wk && !g.played).forEach(g => { const r = fillGame(g); if (!r.ok) throw new Error(r.error); }); console.log('week', wk, 'games', S.games.filter(g => g.week === wk).map(g => g.home + 'v' + g.away + '=' + g.hs + '-' + g.as).join(' ')); }
console.log('champion', A.store.champion(1));
const st = A.standings(S.games.filter(g => g.type === 'reg'));
st.divs.forEach(d => console.log(d.div.name, d.teams.map(t => t + ' ' + A.rec(st.aggs[t].w, st.aggs[t].l, st.aggs[t].t)).join(', ')));
st.confs.forEach(c => console.log(c.conf.short, 'order', c.order.join(',')));
console.log('picks', JSON.stringify(A.props.summary(), (k, v) => k === 'recent' || k === 'pending' ? undefined : v));
// season 2
A.store.newSeason();
const g2 = S.games.find(g => g.season === 2 && g.week === 1);
fillGame(g2);
const played = S.games.filter(g => g.played);
const f = A.broadcastFacts(played, 'MET', 'WMT', 2);
console.log('FACTS MET v WMT', JSON.stringify(f, null, 1).slice(0, 2400));
const pid = Object.keys(S.players).find(p => S.players[p].pos === 'QB');
console.log('player facts', JSON.stringify(A.playerFacts(A.playerLog(played, pid)).hi.slice(0, 3)));
const rb = A.recordBook(played); console.log('records', rb.player.length, rb.team.length, rb.season.length);
console.log('suggest MVP', A.suggest('MVP', 1).slice(0, 3).map(x => S.players[x.pid].name + ' ' + x.score.toFixed(1)));
console.log('titles', A.titleWinners(1).slice(0, 3).map(t => t.label + ' ' + S.players[t.pid].name + ' ' + t.v));
console.log('all-league', A.allLeague(1).length);
