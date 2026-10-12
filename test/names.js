const { A } = require('./helpers.js');
// fresh league
A.store.load(); let S = A.store.state;
const ps = Object.values(S.players);
const lasts = ps.map(p => p.name.split(' ')[1]);
console.log('players', ps.length, 'unique full names', new Set(ps.map(p => p.name)).size, 'unique last names', new Set(lasts).size, 'pool', JSON.stringify(A.NAME_POOL_SIZE));
const dupFirst = A.TEAMS.filter(t => { const f = ps.filter(p => p.team === t.id).map(p => p.name.split(' ')[0]); return new Set(f).size !== f.length; });
console.log('teams with repeated first names:', dupFirst.map(t => t.id).join(',') || 'none');
console.log('sample WNG:', ps.filter(p => p.team === 'WNG').slice(0, 8).map(p => p.name).join(', '));
// upgrade an old save: old-style names get replaced, a hand-edited name stays
const old = JSON.parse(JSON.stringify(S)); delete old.names2;
Object.values(old.players).forEach((p, i) => p.name = ['Zeke', 'Marcus', 'Eli'][i % 3] + ' ' + ['Duvall', 'Truitt', 'Whitfield'][i % 3]);
old.players.p5.name = 'Trey Howard Jr';
localStorage.setItem('adfl-stats-v1', JSON.stringify(old));
A.store.load(); S = A.store.state;
console.log('after upgrade p5:', S.players.p5.name, '| p1:', S.players.p1.name, '| any Duvall left:', Object.values(S.players).some(p => p.name.endsWith('Duvall')));
