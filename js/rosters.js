// Makes a 24-man roster for every team. Names are made up from mix-and-match pools (no real players).
(function (G) {
  const A = G.ADFL;

  A.POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
  // how many of each position, and the jersey number range for them
  A.ROSTER_SLOTS = [
    ['QB', 2, [1, 19]], ['RB', 2, [20, 39]], ['WR', 4, [80, 89]], ['TE', 1, [80, 89]],
    ['OL', 3, [60, 79]], ['DL', 3, [90, 99]], ['LB', 3, [40, 59]], ['CB', 2, [20, 39]], ['S', 2, [20, 39]],
    ['K', 1, [1, 19]], ['P', 1, [1, 19]],
  ];

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
    for (const [pos, count, [lo, hi]] of A.ROSTER_SLOTS) {
      for (let d = 0; d < count; d++) {
        let name, tries = 0;
        do { name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)]; } while (names.has(name) && ++tries < 50);
        names.add(name);
        let num, nt = 0;
        do { num = lo + Math.floor(r() * (hi - lo + 1)); } while (numsUsed.has(num) && ++nt < 80);
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
