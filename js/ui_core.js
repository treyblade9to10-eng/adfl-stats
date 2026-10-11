// Small UI toolkit: router, team badges, sortable tables, modal, toast.
(function (G) {
  const A = G.ADFL;
  const esc = A.esc;
  const UI = A.ui = { season: null, views: {}, acts: {}, changes: {}, inputs: {} };

  // ---------- bits of html ----------
  UI.badge = (tid, size) => {
    const t = A.team(tid); if (!t) return '';
    return `<span class="badge ${size || ''}" style="--c1:${t.c1};--c2:${t.c2}">${tid}</span>`;
  };
  UI.tlink = (tid, mode) => `<a class="tl" href="#/team/${tid}">${UI.badge(tid)}<span>${esc(mode === 'nick' ? A.tNick(tid) : mode === 'city' ? A.tCity(tid) : A.tName(tid))}</span></a>`;
  UI.plink = (pid, extra) => { const p = A.store.state.players[pid]; return p ? `<a class="pl" href="#/player/${pid}">${esc(p.name)}</a>${extra || ''}` : esc(pid); };
  UI.pos = p => `<span class="pos">${p.pos}</span>`;
  UI.glink = (g, text) => `<a href="#/game/${g.id}">${text}</a>`;
  UI.title = (t, sub, right) => `<div class="ptitle"><div><h1>${esc(t)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${right ? `<div class="pright">${right}</div>` : ''}</div>`;
  UI.card = (title, body, cls) => `<section class="card ${cls || ''}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;
  UI.empty = msg => `<div class="empty">${msg}</div>`;
  UI.tabs = (items, cur, hrefFn) => `<div class="tabs">${items.map(([id, label]) => `<a class="${id === cur ? 'on' : ''}" href="${hrefFn(id)}">${esc(label)}</a>`).join('')}</div>`;
  UI.seasonTag = s => `Season ${s}`;
  UI.dim = t => `<span class="dim">${t}</span>`;

  // Game score pill used in lists
  UI.scoreLine = (g) => {
    if (!g.played) return `<span class="dim">${UI.when(g)}</span>`;
    const w = A.winnerOf(g);
    return `<b class="${w === g.away ? 'win' : ''}">${g.as}</b> - <b class="${w === g.home ? 'win' : ''}">${g.hs}</b>${g.ot ? ' <span class="ot">OT</span>' : ''}`;
  };
  UI.when = g => g.type === 'playoff' ? A.LEAGUE.roundNames[g.week] : `Week ${g.week}`;

  // ---------- sortable tables ----------
  // cols: [{h, v(row) -> raw value for sorting, f(row) -> html (optional), cls, title}]
  UI.table = function (cols, rows, opts) {
    opts = opts || {};
    const head = cols.map((c, i) => `<th class="${c.cls || ''}" data-i="${i}" ${c.title ? `title="${esc(c.title)}"` : ''}>${c.h}</th>`).join('');
    const body = rows.map(r => `<tr ${opts.rowAttr ? opts.rowAttr(r) : ''} class="${opts.rowCls ? opts.rowCls(r) : ''}">${cols.map(c => {
      const v = c.v ? c.v(r) : '';
      return `<td class="${c.cls || ''}" data-v="${esc(typeof v === 'number' ? (isFinite(v) ? v : 0) : v)}">${c.f ? c.f(r) : esc(v)}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="tw ${opts.cls || ''}"><table class="${opts.sortable === false ? '' : 'sortable'} ${opts.tcls || ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  };

  function bindSort(root) {
    root.querySelectorAll('table.sortable').forEach(tb => {
      tb.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
        const i = +th.dataset.i, asc = th.dataset.dir !== 'asc';
        tb.querySelectorAll('th').forEach(x => { x.dataset.dir = ''; });
        th.dataset.dir = asc ? 'asc' : 'desc';
        const body = tb.tBodies[0], rows = [...body.rows];
        rows.sort((a, b) => {
          const x = a.cells[i].dataset.v, y = b.cells[i].dataset.v;
          const nx = parseFloat(x), ny = parseFloat(y);
          const r = (!isNaN(nx) && !isNaN(ny) && /^-?[\d.]+$/.test(x) && /^-?[\d.]+$/.test(y)) ? nx - ny : String(x).localeCompare(String(y));
          return asc ? r : -r;
        });
        rows.forEach(r => body.appendChild(r));
      }));
    });
  }

  // ---------- modal + toast ----------
  UI.modal = function (html, cls) {
    UI.closeModal();
    const d = document.createElement('div'); d.id = 'modal'; d.className = 'modal';
    d.innerHTML = `<div class="mbox ${cls || ''}"><button class="mx" data-act="closeModal" aria-label="Close">x</button>${html}</div>`;
    d.addEventListener('click', e => { if (e.target === d) UI.closeModal(); });
    document.body.appendChild(d);
    return d;
  };
  UI.closeModal = () => { const m = document.getElementById('modal'); if (m) m.remove(); };
  UI.toast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('show'), 2600);
  };
  UI.confirm = function (msg, yes, label) {
    const m = UI.modal(`<h3>${esc(msg)}</h3><div class="row end"><button data-act="closeModal">Cancel</button><button class="gold" id="cfy">${label || 'Yes'}</button></div>`, 'small');
    m.querySelector('#cfy').onclick = () => { UI.closeModal(); yes(); };
  };

  // ---------- router ----------
  UI.parse = function () {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
    return { name: parts[0] || 'home', args: parts.slice(1), q };
  };
  UI.go = h => { if (location.hash === h) UI.render(); else location.hash = h; };
  UI.setQ = (patch) => { const r = UI.parse(); const q = Object.assign({}, r.q, patch); const qs = Object.keys(q).filter(k => q[k] !== '' && q[k] != null).map(k => k + '=' + encodeURIComponent(q[k])).join('&'); location.hash = '#/' + [r.name].concat(r.args.map(encodeURIComponent)).join('/') + (qs ? '?' + qs : ''); };

  UI.NAV = [['home', 'Home'], ['schedule', 'Schedule'], ['standings', 'Standings'], ['teams', 'Teams'], ['players', 'Players'], ['leaders', 'Leaders'],
    ['matchup', 'Matchups'], ['picks', 'Picks'], ['awards', 'Awards'], ['records', 'Records'], ['settings', 'Settings']];

  UI.render = function () {
    const r = UI.parse();
    const view = UI.views[r.name] || UI.views.home;
    const main = document.getElementById('main');
    let html;
    try { html = view(r.args, r.q); } catch (e) { console.error(e); html = `<div class="card"><h3>Something broke on this page</h3><p class="dim">${esc(e.message)}</p></div>`; }
    main.innerHTML = html;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.n === (r.name === 'game' || r.name === 'record' ? 'schedule' : r.name === 'team' ? 'teams' : r.name === 'player' ? 'players' : r.name)));
    bindSort(main);
    if (UI.after) { const f = UI.after; UI.after = null; f(main, r); }
    const sel = document.getElementById('seasonSel'); if (sel) sel.value = UI.season;
    if (!UI.keepScroll) window.scrollTo(0, 0);
    UI.keepScroll = false;
  };

  UI.boot = function () {
    A.store.load();
    UI.season = A.store.state.seasonNow;
    const nav = document.getElementById('nav');
    nav.innerHTML = UI.NAV.map(([id, l]) => `<a data-n="${id}" href="#/${id}">${l}</a>`).join('');
    UI.fillSeasonSel();
    document.getElementById('seasonSel').addEventListener('change', e => { UI.season = +e.target.value; UI.render(); });
    document.body.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const f = UI.acts[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); }
    });
    document.body.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && UI.changes[el.dataset.change]) UI.changes[el.dataset.change](el, e); });
    document.body.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && UI.inputs[el.dataset.input]) UI.inputs[el.dataset.input](el, e); });
    window.addEventListener('hashchange', () => { UI.closeModal(); UI.render(); });
    UI.acts.closeModal = () => UI.closeModal();
    UI.render();
  };
  UI.fillSeasonSel = function () {
    const sel = document.getElementById('seasonSel');
    sel.innerHTML = A.store.seasons().map(s => `<option value="${s}">Season ${s}</option>`).join('');
    sel.value = UI.season;
  };
})(globalThis);
