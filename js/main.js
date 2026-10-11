// Start the app, and register the offline copy.
(function (G) {
  const A = G.ADFL;
  window.addEventListener('DOMContentLoaded', () => {
    A.ui.boot();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  });
})(globalThis);
