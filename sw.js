// Offline support: network first so updates show right away, saved copy when there's no signal.
const CACHE = 'adfl-v1.3';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/barlow-500.woff2', 'fonts/barlow-700.woff2', 'fonts/bc-600.woff2', 'fonts/bc-800.woff2', 'fonts/bc-800i.woff2', 'fonts/bc-900i.woff2',
  'js/league.js', 'js/schedule.js', 'js/names.js', 'js/rosters.js', 'js/stats.js', 'js/store.js', 'js/facts.js', 'js/props.js', 'js/awards.js', 'js/odds.js', 'js/logos.js', 'icons/logo.svg', 'js/ui_core.js',
  'js/views_main.js', 'js/views_game.js', 'js/views_record.js', 'js/views_live.js', 'js/sync.js', 'js/views_teams.js', 'js/views_players.js', 'js/views_misc.js', 'js/main.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !u.hostname.endsWith('gstatic.com')) return;   // let Firebase talk to the network directly
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
