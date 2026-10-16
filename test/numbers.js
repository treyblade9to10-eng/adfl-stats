const { A } = require('./helpers.js');
const fs = require('fs');
const report = (label, st) => {
  const ps = Object.values(st.players);
  const wr = ps.filter(p => p.pos === 'WR').map(p => p.num);
  const dupTeams = A.TEAMS.filter(t => { const n = ps.filter(p => p.team === t.id).map(p => p.num); return new Set(n).size !== n.length; }).map(t => t.id);
  const most80 = Math.max(...A.TEAMS.map(t => ps.filter(p => p.team === t.id && p.pos === 'WR' && p.num >= 80).length));
  console.log(label, '| most WRs in the 80s on one team:', most80, '| WRs in 80s:', wr.filter(n => n >= 80).length, 'of', wr.length, '| WRs 1-19:', wr.filter(n => n < 20).length, '| teams with repeated numbers:', dupTeams.join(',') || 'none');
};
// 1. brand new league
A.store.load(); report('fresh league  ', A.store.state);
const byPos = {}; Object.values(A.store.state.players).forEach(p => (byPos[p.pos] = byPos[p.pos] || []).push(p.num));
console.log('   sample numbers:', Object.entries(byPos).map(([k, v]) => k + ' ' + v.slice(0, 5).join('/')).join('  '));
// 2. copy of the real cloud league (old numbers)
const cloud = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const data = JSON.parse(cloud.data);
report('cloud BEFORE  ', data);
localStorage.setItem('adfl-stats-v1', JSON.stringify(data));
A.store.load(); report('cloud AFTER   ', A.store.state);
const s = A.store.state;
console.log('   game still there:', s.games.filter(g => g.played).map(g => `${g.away} ${g.as} @ ${g.home} ${g.hs}`).join(', '), '| picks', s.picks.length, '| names kept:', Object.values(s.players).every(p => data.players[p.id].name === p.name));
const met = Object.values(s.players).filter(p => p.team === 'MET' && p.pos === 'WR').map(p => `${p.name} #${data.players[p.id].num}->#${p.num}`);
console.log('   Monarchs WRs:', met.join(', '));
// 3. running it again does nothing
const again = JSON.stringify(s); localStorage.setItem('adfl-stats-v1', again); A.store.load(); console.log('   second load changes nothing:', JSON.stringify(A.store.state) === again);
