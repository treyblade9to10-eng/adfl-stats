const { A, fillGame } = require('./helpers.js');
// migration: pretend an old save has Chick-fil-A in it
A.store.load(); const S0 = A.store.state;
const old = JSON.parse(JSON.stringify(S0).replace(/"WNG"/g, '"CFA"'));
const g0 = old.games.find(g => g.home === 'CFA' || g.away === 'CFA'); g0.box = { p1: { t: 'CFA', py: 10 } };
localStorage.setItem('adfl-stats-v1', JSON.stringify(old));
A.store.load(); const S = A.store.state;
console.log('CFA left after migrate:', JSON.stringify(S).includes('CFA'), '| WNG players:', Object.values(S.players).filter(p => p.team === 'WNG').length);
S.games.forEach(g => { if (g.box && g.box.p1 && g.id === g0.id) delete g.box; });
// odds before any games
const g1 = S.games[0]; console.log('week1 odds', A.tNick(g1.home), A.pct0(A.odds.game(g1).pHome));
for (let w = 1; w <= 10; w++) S.games.filter(g => g.week === w).forEach(g => { const pr = A.props.forGame(g); A.props.pick(pr[0], 'over'); A.props.pick(pr[2], 'under'); fillGame(g); });
for (const wk of [11, 12, 13]) S.games.filter(g => g.week === wk && !g.played).forEach(g => fillGame(g));
const rec = A.odds.record(); console.log('favorites won', rec.right, 'of', rec.n, A.pct0(rec.pct), 'upsets', rec.upsets.length);
const sum = A.props.summary(); console.log('picks expected', sum.expected.toFixed(1), 'of', sum.expN, 'actual', sum.expW);
const pr = A.props.forGame(S.games.find(g => g.week === 10)); console.log('prop chance sample', pr[0].label, pr[0].line, JSON.stringify(A.odds.prop(pr[0], S.games.find(g => g.week === 10))));
