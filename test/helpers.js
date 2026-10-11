// loads the engine in node with a fake localStorage, plus a random game filler
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
for (const f of ['league', 'schedule', 'rosters', 'logos', 'stats', 'store', 'facts', 'props', 'awards', 'odds']) require('../js/' + f + '.js');
const A = globalThis.ADFL;
let seed = 5; const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
function fillGame(g, opts = {}) {
  const S = A.store.state;
  const d = A.store.newDraft(g);
  const strength = t => A.store.roster(t).reduce((s, p) => s + p.ovr, 0) / 24;
  for (const side of ['home', 'away']) {
    const tid = g[side], str = strength(tid);
    let tds = Math.max(0, Math.round((str - 62) / 5 + r() * 3 - .5)), fgs = ri(0, 3);
    const qs = [0, 0, 0, 0, 0];
    for (let i = 0; i < tds; i++) qs[ri(0, 3)] += 7; for (let i = 0; i < fgs; i++) qs[ri(0, 3)] += 3;
    d.q[side] = qs.map((v, i) => i === 4 ? null : v);
    const ros = A.store.roster(tid);
    const qb = ros.find(p => p.pos === 'QB'), rb = ros.find(p => p.pos === 'RB'), wrs = ros.filter(p => p.pos === 'WR'), te = ros.find(p => p.pos === 'TE');
    const att = ri(18, 34), cmp = ri(Math.floor(att * .5), Math.floor(att * .75)), py = ri(cmp * 8, cmp * 14), ptd = Math.floor(tds / 2);
    d.box[qb.id] = { t: tid, pa: att, pc: cmp, py, ptd, pint: ri(0, 2), psk: ri(0, 3) };
    const ra = ri(10, 22); d.box[rb.id] = { t: tid, ra, ry: ri(ra * 2, ra * 6), rtd: tds - ptd, rlng: ri(5, 40), fum: r() < .1 ? 1 : 0 };
    // receivers share passing yards/tds
    let left = py, tdl = ptd, recLeft = cmp;
    [wrs[0], wrs[1], te].forEach((p, i) => { const y = i === 2 ? left : Math.floor(left * (i === 0 ? .45 : .5)); const rec = i === 2 ? recLeft : Math.max(0, Math.floor(recLeft * .45)); const t = i === 2 ? tdl : (tdl ? ri(0, tdl) : 0); d.box[p.id] = { t: tid, tg: rec + ri(0, 3), rec, recy: y, rectd: t, reclng: Math.min(y, ri(8, 50)) }; left -= y; tdl -= t; recLeft -= rec; });
    const k = ros.find(p => p.pos === 'K'); d.box[k.id] = { t: tid, fgm: fgs, fga: fgs + (r() < .2 ? 1 : 0), fglng: fgs ? ri(25, 52) : 0, xpm: tds, xpa: tds };
    ros.filter(p => ['DL', 'LB', 'CB', 'S'].includes(p.pos)).forEach(p => { d.box[p.id] = { t: tid, tkl: ri(0, 9), sck: r() < .2 ? 1 : 0, dint: r() < .06 ? 1 : 0, pd: ri(0, 2) }; });
    d.team[side] = { fd: ri(12, 26), thM: ri(2, 8), thA: ri(8, 14), rzM: ri(0, 3), rzA: ri(1, 4), pen: ri(2, 8), penY: ri(15, 70), top: ri(24, 36) * 60 + ri(0, 59) };
  }
  if (g.type === 'playoff' && A.sumQ(d.q.home) === A.sumQ(d.q.away)) d.q.home[4] = 3;
  d.firstScore = r() < .5 ? 'home' : 'away';
  return A.store.saveGame(g, d);
}
module.exports = { A, r, ri, fillGame };
