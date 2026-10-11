// Record a game: score by quarter, team stats, then player stats for both teams. Auto-saves a draft as you type.
(function (G) {
  const A = G.ADFL, UI = A.ui, esc = A.esc;
  const ST = () => A.store;
  const n0 = A.num;
  let cur = null;         // { g, d }
  let activeTab = 'away';
  let saveT = null;

  const getPath = (o, path) => path.reduce((x, k) => (x == null ? undefined : x[k]), o);
  function setPath(o, path, val) {
    for (let i = 0; i < path.length - 1; i++) { const k = path[i]; if (o[k] == null) o[k] = {}; o = o[k]; }
    o[path[path.length - 1]] = val;
  }

  function visibleRows(tid, grp) {
    const d = cur.d;
    const ros = ST().roster(tid);
    const added = (d.rows && d.rows[tid + ':' + grp.id]) || [];
    const keys = grp.cols.map(c => c[0]);
    const have = ros.filter(p => d.box[p.id] && keys.some(k => d.box[p.id][k] !== '' && d.box[p.id][k] != null));
    const base = ros.filter(p => grp.pos.includes(p.pos));
    const seen = new Set(), out = [];
    [...base, ...have, ...added.map(id => ST().P(id)).filter(Boolean)].forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } });
    return out;
  }

  function groupBlock(tid, grp) {
    const rows = visibleRows(tid, grp), ros = ST().roster(tid);
    const shown = new Set(rows.map(p => p.id));
    const rest = ros.filter(p => !shown.has(p.id));
    return `<div class="tw"><table class="bs form"><thead><tr><th>${grp.title}</th>${grp.cols.map(c => `<th class="num">${c[1]}</th>`).join('')}</tr></thead><tbody>
      ${rows.length ? rows.map(p => `<tr><td class="pn">${esc(p.name)} ${UI.dim(p.pos + ' #' + p.num)}</td>${grp.cols.map(([k, , step]) => {
        const v = cur.d.box[p.id] ? cur.d.box[p.id][k] : '';
        return `<td class="num"><input type="number" inputmode="decimal" min="0" step="${step || 1}" data-input="rec" data-path="box.${p.id}.${k}" data-t="${tid}" value="${v == null ? '' : v}"></td>`;
      }).join('')}</tr>`).join('') : `<tr><td colspan="${grp.cols.length + 1}" class="dim">Nobody added yet</td></tr>`}
      </tbody></table></div>
      <div class="addrow"><select data-change="addRow" data-t="${tid}" data-grp="${grp.id}"><option value="">+ Add a player to ${grp.title.toLowerCase()}</option>${rest.map(p => `<option value="${p.id}">${esc(p.name)} (${p.pos} #${p.num})</option>`).join('')}</select></div>`;
  }

  function teamBlock(tid, side) {
    const t = cur.d.team[side] || {};
    const f = (k, ph, w) => `<input type="text" inputmode="numeric" class="tf ${w || ''}" placeholder="${ph || ''}" data-input="rec" data-path="team.${side}.${k}" value="${t[k] == null ? '' : (k === 'top' && typeof t[k] === 'number' ? A.mmss(t[k]) : t[k])}">`;
    return `<div class="tblock ${activeTab === side ? 'show' : ''}" data-side="${side}">
      <div class="card"><h3>${UI.tlink(tid)} team stats</h3>
        <div class="tgrid">
          <label>First downs${f('fd')}</label>
          <label>3rd down made / att<span class="pair">${f('thM')}<i>/</i>${f('thA')}</span></label>
          <label>4th down made / att<span class="pair">${f('foM')}<i>/</i>${f('foA')}</span></label>
          <label>Red zone TDs / trips<span class="pair">${f('rzM')}<i>/</i>${f('rzA')}</span></label>
          <label>Penalties / yards<span class="pair">${f('pen')}<i>/</i>${f('penY')}</span></label>
          <label>Time of possession<span class="pair">${f('top', 'mm:ss', 'wide')}</span></label>
          <label>2-pt conversions made${f('tp')}</label>
          <label>Safeties scored${f('saf')}</label>
        </div></div>
      ${A.GROUPS.map(grp => `<div class="card"><h3>${UI.tlink(tid, 'nick')} / ${grp.title}</h3>${groupBlock(tid, grp)}</div>`).join('')}
    </div>`;
  }

  function checks() {
    const g = cur.g, d = cur.d, w = [];
    const fake = { home: g.home, away: g.away, box: {}, team: d.team };
    // numeric copy of the box
    for (const pid in d.box) { fake.box[pid] = { t: d.box[pid].t }; for (const k of A.ALLKEYS) fake.box[pid][k] = n0(d.box[pid][k]); }
    const hs = A.sumQ(d.q.home), as = A.sumQ(d.q.away);
    const entered = d.q.home.some(v => v !== '' && v != null) || d.q.away.some(v => v !== '' && v != null);
    const L = { home: A.teamLine(fake, g.home), away: A.teamLine(fake, g.away) };
    const sc = { home: hs, away: as };
    if (entered) for (const s of ['away', 'home']) {
      const l = L[s];
      if (l.expPts !== sc[s] && (l.tds || l.fgm || l.xpm || sc[s])) w.push(`${A.tNick(g[s])}: the stats add up to ${l.expPts} points (${l.tds} TD, ${l.xpm} XP, ${l.fgm} FG, ${l.tp} two-pt, ${l.saf} safety) but the score is ${sc[s]}.`);
    }
    for (const s of ['away', 'home']) {
      const l = L[s], N = A.tNick(g[s]);
      if (l.py !== l.recy && (l.py || l.recy)) w.push(`${N}: passing yards (${l.py}) and receiving yards (${l.recy}) don't match.`);
      if (l.pc !== l.rec && (l.pc || l.rec)) w.push(`${N}: completions (${l.pc}) and catches (${l.rec}) don't match.`);
      if (l.ptd !== l.rectd && (l.ptd || l.rectd)) w.push(`${N}: passing TDs (${l.ptd}) and receiving TDs (${l.rectd}) don't match.`);
      if (l.fgm > l.fga) w.push(`${N}: more field goals made than attempted.`);
      if (l.xpm > l.xpa) w.push(`${N}: more extra points made than attempted.`);
      if (l.pc > l.pa) w.push(`${N}: more completions than attempts.`);
      const o = L[s === 'home' ? 'away' : 'home'];
      if (l.pint !== o.dint && (l.pint || o.dint)) w.push(`${N} threw ${l.pint} INT but the other defense has ${o.dint}.`);
      if (n0(d.team[s].thM) > n0(d.team[s].thA)) w.push(`${N}: 3rd downs made is more than attempts.`);
    }
    if (g.type === 'playoff' && entered && hs === as) w.push('Playoff game needs a winner: put the overtime score in the OT box.');
    return { w, hs, as };
  }

  function paintLive() {
    const { w, hs, as } = checks();
    const ew = document.getElementById('warns');
    if (ew) ew.innerHTML = w.length ? `<h4>Quick check (you can still save)</h4><ul>${w.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="dim">Everything adds up.</div>';
    const a = document.getElementById('totAway'), h = document.getElementById('totHome');
    if (a) a.textContent = as; if (h) h.textContent = hs;
  }

  UI.views.record = function ([id]) {
    const g = ST().game(id); if (!g) return UI.empty('Game not found.');
    if (g.played && ST().lockedByPlayoffs(g)) return `<a class="back" href="#/game/${id}">Back</a>` + UI.card('Locked', '<p>The next playoff round was already built from this result. Reset the later round first if you really need to change this.</p>');
    if (!cur || cur.g.id !== id) { cur = { g, d: ST().draftFor(g) }; activeTab = 'away'; }
    if (!cur.d.rows) cur.d.rows = {};
    const d = cur.d;
    // make sure box lines know their team
    const q = (side, i) => d.q[side][i] == null ? '' : d.q[side][i];
    const qrow = (side, tid) => `<tr><td>${UI.tlink(tid, 'nick')}</td>${[0, 1, 2, 3, 4].map(i => `<td class="num"><input type="number" min="0" inputmode="numeric" data-input="rec" data-path="q.${side}.${i}" value="${q(side, i)}"></td>`).join('')}<td class="num"><b id="tot${side === 'away' ? 'Away' : 'Home'}">0</b></td></tr>`;
    const all = ST().roster(g.home).concat(ST().roster(g.away));
    let h = `<a class="back" href="#/game/${g.id}">Back to game</a>` + UI.title(`${A.tName(g.away)} at ${A.tName(g.home)}`, `${UI.when(g)} / Season ${g.season}${g.played ? ' / editing a saved game' : ''}`);
    h += UI.card('Score', `<div class="tw"><table class="bs form qt"><thead><tr><th></th><th class="num">Q1</th><th class="num">Q2</th><th class="num">Q3</th><th class="num">Q4</th><th class="num">OT</th><th class="num">FINAL</th></tr></thead><tbody>${qrow('away', g.away)}${qrow('home', g.home)}</tbody></table></div>
      <div class="row wrapr"><label class="inl">Who scored first?
        <select data-change="recField" data-path="firstScore"><option value="">Not sure</option><option value="away" ${d.firstScore === 'away' ? 'selected' : ''}>${esc(A.tNick(g.away))}</option><option value="home" ${d.firstScore === 'home' ? 'selected' : ''}>${esc(A.tNick(g.home))}</option></select></label></div>`);
    h += `<div class="tabs sw"><a class="${activeTab === 'away' ? 'on' : ''}" data-act="recTab" data-side="away" href="#">${esc(A.tName(g.away))}</a><a class="${activeTab === 'home' ? 'on' : ''}" data-act="recTab" data-side="home" href="#">${esc(A.tName(g.home))}</a></div>`;
    h += teamBlock(g.away, 'away') + teamBlock(g.home, 'home');
    h += UI.card('Finish', `<label class="inl">Player of the game
        <select data-change="recField" data-path="pog"><option value="">Pick for me (best stats)</option>${all.map(p => `<option value="${p.id}" ${d.pog === p.id ? 'selected' : ''}>${esc(p.name)} (${A.tNick(p.team)} ${p.pos})</option>`).join('')}</select></label>
      <label class="blk">Notes (optional)<textarea rows="2" data-input="rec" data-path="notes" placeholder="Anything worth remembering about this game">${esc(d.notes || '')}</textarea></label>
      <div id="warns" class="warns"></div>
      <div class="row end"><button data-act="recCancel">Leave (draft is kept)</button><button class="gold big" data-act="recSave">Save game</button></div>`);
    UI.after = () => paintLive();
    return h;
  };

  UI.inputs.rec = el => {
    const path = el.dataset.path.split('.');
    let val = el.value;
    if (path[0] === 'q') { val = val === '' ? null : +val; }
    setPath(cur.d, path, val);
    if (path[0] === 'box') { const pid = path[1]; if (!cur.d.box[pid].t) cur.d.box[pid].t = el.dataset.t; }
    if (path[0] === 'q' && path[2] === '4') cur.d.ot = val != null;
    clearTimeout(saveT); saveT = setTimeout(() => ST().saveDraft(cur.g, cur.d), 400);
    paintLive();
  };
  UI.changes.recField = el => { setPath(cur.d, el.dataset.path.split('.'), el.value); ST().saveDraft(cur.g, cur.d); };
  UI.changes.addRow = el => {
    if (!el.value) return;
    const key = el.dataset.t + ':' + el.dataset.grp;
    (cur.d.rows[key] = cur.d.rows[key] || []).push(el.value);
    if (!cur.d.box[el.value]) cur.d.box[el.value] = { t: el.dataset.t };
    ST().saveDraft(cur.g, cur.d);
    UI.keepScroll = true; UI.render();
    // the add-row select is re-rendered; keep the user on the same team tab
  };
  UI.acts.recTab = (el) => {
    activeTab = el.dataset.side;
    document.querySelectorAll('.tblock').forEach(b => b.classList.toggle('show', b.dataset.side === activeTab));
    document.querySelectorAll('.tabs.sw a').forEach(a => a.classList.toggle('on', a.dataset.side === activeTab));
  };
  UI.acts.recCancel = () => { ST().saveDraft(cur.g, cur.d); UI.go('#/game/' + cur.g.id); };
  UI.acts.recSave = () => {
    const { w, hs, as } = checks();
    const anyScore = cur.d.q.home.some(v => v != null && v !== '') || cur.d.q.away.some(v => v != null && v !== '');
    if (!anyScore) return UI.toast('Put in the score first (quarter by quarter).');
    const go = () => {
      const g = cur.g;
      const res = ST().saveGame(g, cur.d);
      if (!res.ok) return UI.toast(res.error);
      cur = null; UI.fillSeasonSel(); UI.toast('Game saved');
      const next = ST().state.games.find(x => x.season === g.season && x.week > g.week && x.type === 'playoff' && !x.played);
      UI.go('#/game/' + g.id);
    };
    if (w.length) UI.confirm(`${w.length} thing${w.length > 1 ? 's' : ''} don't add up (${w[0]}). Save anyway?`, go, 'Save anyway'); else go();
  };
})(globalThis);
