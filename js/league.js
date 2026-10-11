// ADFL = Aisle & Drive-Thru Football League. Teams, divisions, small helpers shared by everything else.
(function (G) {
  const A = G.ADFL = G.ADFL || {};

  A.LEAGUE = {
    name: 'ADFL',
    full: 'Aisle & Drive-Thru Football League',
    champGame: 'Super Combo',
    trophy: 'The Golden Receipt',
    regWeeks: 10,
    roundNames: { 11: 'Conference Semifinals', 12: 'Conference Championships', 13: 'Super Combo' },
  };

  A.CONFS = [
    { id: 'AC', name: 'Aisle Conference', short: 'Aisle' },
    { id: 'DT', name: 'Drive-Thru Conference', short: 'Drive-Thru' },
  ];

  A.DIVS = [
    { id: 'GRO', conf: 'AC', name: 'Grocery' },
    { id: 'BIG', conf: 'AC', name: 'Big Box' },
    { id: 'BUR', conf: 'DT', name: 'Burger' },
    { id: 'CHK', conf: 'DT', name: 'Chicken & Tacos' },
  ];

  // id, city (the brand), nick, division, primary colour, secondary colour
  const T = [
    ['MET', 'Metro Market', 'Monarchs', 'GRO', '#1b5e3a', '#f0b323'],
    ['ALD', 'Aldi', 'Alligators', 'GRO', '#12337a', '#f7941d'],
    ['PNS', "Pick 'n Save", 'Pioneers', 'GRO', '#c8102e', '#f1f1f1'],
    ['TGT', 'Target', 'Bulls', 'BIG', '#cc0000', '#f4f4f4'],
    ['WMT', 'Walmart', 'Warriors', 'BIG', '#0071ce', '#ffc220'],
    ['COS', 'Costco', 'Cougars', 'BIG', '#e31837', '#2f6fc0'],
    ['MCD', "McDonald's", 'Mustangs', 'BUR', '#da291c', '#ffc72c'],
    ['CUL', "Culver's", 'Curds', 'BUR', '#0a3d7c', '#f2c230'],
    ['BKG', 'Burger King', 'Kings', 'BUR', '#ec6a1e', '#2a5db0'],
    ['CFA', 'Chick-fil-A', 'Cows', 'CHK', '#e51636', '#f4f4f4'],
    ['TCB', 'Taco Bell', 'Bandits', 'CHK', '#6d2a82', '#e8478b'],
    ['CHP', 'Chipotle', 'Peppers', 'CHK', '#a81612', '#9a7a52'],
  ];
  A.TEAMS = T.map(([id, city, nick, div, c1, c2]) => ({ id, city, nick, div, c1, c2, conf: A.DIVS.find(d => d.id === div).conf }));
  const byId = {}; A.TEAMS.forEach(t => byId[t.id] = t);

  A.team = id => byId[id];
  A.tName = id => byId[id] ? `${byId[id].city} ${byId[id].nick}` : id;
  A.tCity = id => byId[id] ? byId[id].city : id;
  A.tNick = id => byId[id] ? byId[id].nick : id;
  A.div = id => A.DIVS.find(d => d.id === id);
  A.conf = id => A.CONFS.find(c => c.id === id);
  A.divTeams = d => A.TEAMS.filter(t => t.div === d).map(t => t.id);
  A.confTeams = c => A.TEAMS.filter(t => t.conf === c).map(t => t.id);

  // Which division each division plays across conferences. Flips every season.
  A.crossDiv = (season, div) => {
    const odd = { GRO: 'BUR', BUR: 'GRO', BIG: 'CHK', CHK: 'BIG' };
    const even = { GRO: 'CHK', CHK: 'GRO', BIG: 'BUR', BUR: 'BIG' };
    return (season % 2 ? odd : even)[div];
  };

  // Seeded random so the same season always makes the same schedule / roster.
  A.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  A.shuffle = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  A.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  // Round-name helper for any week number
  A.weekName = (w) => w <= A.LEAGUE.regWeeks ? `Week ${w}` : A.LEAGUE.roundNames[w] || `Playoffs ${w}`;
})(globalThis);
