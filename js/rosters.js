// Makes a 24-man roster for every team. Names are made up from mix-and-match pools (no real players).
(function (G) {
  const A = G.ADFL;

  A.POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
  // how many of each position
  A.ROSTER_SLOTS = [['QB', 2], ['RB', 2], ['WR', 4], ['TE', 1], ['OL', 3], ['DL', 3], ['LB', 3], ['CB', 2], ['S', 2], ['K', 1], ['P', 1]];

  // Jersey numbers like today's NFL: [low, high, how likely]. WRs mostly wear 1-19, some still in the 80s.
  A.NUMBER_RANGES = {
    QB: [[1, 19, 1]], K: [[1, 19, 1]], P: [[1, 19, 1]],
    WR: [[1, 19, .7], [80, 89, .3]],
    WR_LOW: [[1, 19, 1]],            // a team only gets one receiver in the 80s
    RB: [[20, 39, .75], [1, 9, .25]],
    TE: [[80, 89, .75], [40, 49, .25]],
    OL: [[60, 79, .8], [50, 59, .2]],
    DL: [[90, 99, .6], [50, 59, .2], [70, 79, .2]],
    LB: [[40, 59, .8], [1, 9, .2]],
    CB: [[20, 39, .8], [1, 9, .2]],
    S: [[20, 49, .85], [1, 9, .15]],
  };
  // Pick a number for a position that nobody on the team is wearing yet.
  A.pickNumber = function (pos, used, r) {
    const ranges = A.NUMBER_RANGES[pos] || [[1, 99, 1]];
    for (let t = 0; t < 60; t++) {
      let x = r(), rg = ranges[ranges.length - 1];
      for (const g of ranges) { if (x < g[2]) { rg = g; break; } x -= g[2]; }
      const n = rg[0] + Math.floor(r() * (rg[1] - rg[0] + 1));
      if (!used.has(n)) return n;
    }
    for (const g of ranges) for (let n = g[0]; n <= g[1]; n++) if (!used.has(n)) return n;   // everything taken: first free one
    for (let n = 0; n < 100; n++) if (!used.has(n)) return n;
    return 0;
  };

  const FIRST = ['Marcus', 'Devon', 'Jaylen', 'Tyrese', 'Caleb', 'Mason', 'Eli', 'Rashad', 'Bryce', 'Dante', 'Corey', 'Malik', 'Trevor', 'Grant', 'Nolan', 'Jamal', 'Cade', 'Darius', 'Hunter', 'Terrell',
    'Brandon', 'Xavier', 'Colt', 'Reggie', 'Ty', 'Landon', 'Omar', 'Wes', 'Kendrick', 'Austin', 'Micah', 'Dominic', 'Jace', 'Rico', 'Beau', 'Silas', 'Troy', 'Andre', 'Zeke', 'Lamar',
    'Declan', 'Hakeem', 'Roman', 'Quincy', 'Booker', 'Tanner', 'Cyrus', 'Dewayne', 'Everett', 'Felix', 'Gideon', 'Hayes', 'Ivan', 'Jericho', 'Kyle', 'Leo', 'Miles', 'Neil', 'Otis', 'Pierce'];
  const LAST = ['Stone', 'Whitfield', 'Brooks', 'Calloway', 'Mercer', 'Dawson', 'Holloway', 'Fitch', 'Ramsey', 'Okafor', 'Delgado', 'Vance', 'Thorne', 'Sutter', 'Pruitt', 'Nakamura', 'Banks', 'Rollins', 'Kessler', 'Tillman',
    'Maddox', 'Quarles', 'Ingram', 'Fontaine', 'Gaines', 'Hartley', 'Ibarra', 'Jennings', 'Kowalski', 'Lockett', 'Moreau', 'Nash', 'Oyelaran', 'Peralta', 'Radcliffe', 'Sandoval', 'Tate', 'Underhill', 'Vickers', 'Wexler',
    'Yates', 'Zimmer', 'Abernathy', 'Beckett', 'Crowley', 'Duvall', 'Easton', 'Ferrell', 'Grissom', 'Hawthorne', 'Ellison', 'Jarrett', 'Kingsley', 'Lamar', 'Mabry', 'Novak', 'Odom', 'Prescott', 'Quill', 'Rutledge',
    'Spears', 'Truitt', 'Upshaw', 'Voss', 'Whitaker', 'Yarbrough', 'Zeller', 'Archer', 'Bishop', 'Cutler', 'Drummond', 'Emory', 'Fisk', 'Garrison', 'Hobbs', 'Irvin'];

  // Starters rate higher than backups. K/P a little lower spread.
  function rating(r, depth, pos) {
    const base = depth === 0 ? 74 : 60;
    const span = depth === 0 ? 17 : 13;
    let v = base + Math.floor(r() * span);
    if (pos === 'K' || pos === 'P') v = 62 + Math.floor(r() * 26);
    return Math.min(95, v);
  }

  A.makeRoster = function (teamId, nextId, seasonSeed) {
    const r = A.rng((seasonSeed || 1) * 1000 + teamId.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
    const used = new Set(), names = new Set(), numsUsed = new Set(), out = [];
    for (const [pos, count] of A.ROSTER_SLOTS) {
      for (let d = 0; d < count; d++) {
        let name, tries = 0;
        do { name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)]; } while (names.has(name) && ++tries < 50);
        names.add(name);
        const wr80 = pos === 'WR' && out.some(p => p.pos === 'WR' && p.num >= 80);
        const num = A.pickNumber(wr80 ? 'WR_LOW' : pos, numsUsed, r);
        numsUsed.add(num);
        out.push({ id: 'p' + (nextId + out.length), name, num, pos, team: teamId, ovr: rating(r, d, pos), rookie: r() < .14, depth: d });
      }
    }
    return out;
  };

  A.OLD_NAMES = { first: new Set(FIRST), last: new Set(LAST) };   // v1.0 pools, used to spot old auto-names when upgrading

  A.makeAllRosters = function (seed) {
    let n = 1; const all = [];
    A.TEAMS.forEach(t => { const ros = A.makeRoster(t.id, n, seed); n += ros.length; all.push(...ros); });
    const names = A.uniqueNames(all, seed); all.forEach(p => p.name = names[p.id]);
    return { players: all, nextId: n };
  };
})(globalThis);
