/* Service worker : page installable, hors connexion (dernière version gardée), notifications et chiffre rouge sur l'icône. */
const COQUE = 'pilotage-coque-v1', CACHE_BADGE = 'pilotage-badge';
const A_GARDER = ['./', 'index.html', 'manifest.webmanifest', 'icones/icon-192.png', 'icones/icon-512.png', 'icones/apple-touch-icon.png'];
async function lireBadge() { try { const c = await caches.open(CACHE_BADGE), r = await c.match('n'); return r ? Number(await r.text()) || 0 : 0; } catch (e) { return 0; } }
async function ecrireBadge(n) { try { const c = await caches.open(CACHE_BADGE); await c.put('n', new Response(String(n))); } catch (e) {} }
/* Si la notification donne un chiffre (badge), on l'affiche ; sinon on ajoute 1 à ce qui est déjà sur l'icône. */
async function majBadge(d) {
  const n = typeof d.badge === 'number' ? d.badge : (await lireBadge()) + 1;
  await ecrireBadge(n);
  try { if (self.navigator.setAppBadge) { if (n > 0) await self.navigator.setAppBadge(n); else await self.navigator.clearAppBadge(); } } catch (e) {}
}
self.addEventListener('install', e => e.waitUntil(caches.open(COQUE).then(c => c.addAll(A_GARDER)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(noms => Promise.all(noms.filter(n => n !== COQUE && n !== CACHE_BADGE).map(n => caches.delete(n)))).then(() => self.clients.claim())
));
/* Pages et fichiers du site : le réseau d'abord (pour toujours avoir la dernière version), sinon la copie gardée.
   Polices Google : copie gardée d'abord. Appels au serveur (Apps Script) : jamais gardés ici, la page garde elle-même les derniers chiffres. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res && res.ok) { const copie = res.clone(); caches.open(COQUE).then(c => c.put(req, copie)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(COQUE).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }))));
  }
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { corps: e.data && e.data.text() }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.titre || 'Pilotage', { body: d.corps || 'Nouvelle information', icon: 'icones/icon-192.png', badge: 'icones/icon-192.png', data: { url: d.url || './' } }),
    majBadge(d)
  ]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) { if ('focus' in c) return c.focus(); } return self.clients.openWindow(e.notification.data.url || './'); }));
});
