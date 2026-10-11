require('../js/league.js'); require('../js/schedule.js');
const A = globalThis.ADFL;
for (let season = 1; season <= 6; season++) {
  const t0 = Date.now();
  const g = A.makeSchedule(season);
  const per = {}; A.TEAMS.forEach(t => per[t.id] = { gp: 0, h: 0, a: 0, wk: new Set(), opp: {} });
  g.forEach(x => { for (const [t, o, ha] of [[x.home, x.away, 'h'], [x.away, x.home, 'a']]) { per[t].gp++; per[t][ha]++; per[t].wk.add(x.week); per[t].opp[o] = (per[t].opp[o] || 0) + 1; } });
  let bad = [];
  A.TEAMS.forEach(t => { const p = per[t.id]; if (p.gp !== 10 || p.wk.size !== 10 || p.h !== 5) bad.push(t.id + ' gp' + p.gp + ' h' + p.h); });
  const wkCounts = {}; g.forEach(x => wkCounts[x.week] = (wkCounts[x.week] || 0) + 1);
  // back to back rematches
  let b2b = 0; for (let w = 2; w <= 10; w++) { const prev = new Set(g.filter(x => x.week === w - 1).map(x => [x.home, x.away].sort().join())); g.filter(x => x.week === w).forEach(x => { if (prev.has([x.home, x.away].sort().join())) b2b++; }); }
  // kinds
  const kinds = {}; g.forEach(x => kinds[x.kind] = (kinds[x.kind] || 0) + 1);
  console.log('season', season, 'games', g.length, 'weeks', Object.values(wkCounts).join(''), 'bad', bad.join('|') || 'none', 'b2b', b2b, JSON.stringify(kinds), (Date.now() - t0) + 'ms');
  // div pairs: one home one away
  const dv = {}; g.filter(x => x.kind === 'div').forEach(x => { const k = [x.home, x.away].sort().join(); (dv[k] = dv[k] || []).push(x.home); });
  Object.values(dv).forEach(a => { if (a.length !== 2 || a[0] === a[1]) console.log('BAD div pair', a); });
}
