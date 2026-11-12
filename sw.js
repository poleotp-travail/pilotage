/* Service worker : rend la page installable, affiche les notifications et tient le chiffre rouge sur l'icône de l'app. */
const CACHE_BADGE = 'pilotage-badge';
async function lireBadge() { try { const c = await caches.open(CACHE_BADGE), r = await c.match('n'); return r ? Number(await r.text()) || 0 : 0; } catch (e) { return 0; } }
async function ecrireBadge(n) { try { const c = await caches.open(CACHE_BADGE); await c.put('n', new Response(String(n))); } catch (e) {} }
/* Si la notification donne un chiffre (badge), on l'affiche ; sinon on ajoute 1 à ce qui est déjà sur l'icône. */
async function majBadge(d) {
  const n = typeof d.badge === 'number' ? d.badge : (await lireBadge()) + 1;
  await ecrireBadge(n);
  try { if (self.navigator.setAppBadge) { if (n > 0) await self.navigator.setAppBadge(n); else await self.navigator.clearAppBadge(); } } catch (e) {}
}
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
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
