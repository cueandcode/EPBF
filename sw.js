/* EPBF Push Service Worker - pushdiagnose
 * Geen offline caching of bestaande routes aangepast.
 */
'use strict';

self.addEventListener('push', (event) => {
  console.log('[EPBF SW] Push-event ontvangen', { hasData: Boolean(event.data) });

  event.waitUntil((async () => {
    let data = {};
    try {
      if (event.data) {
        const raw = event.data.text();
        try {
          data = JSON.parse(raw);
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            data = { body: raw };
          }
        } catch (_) {
          data = { body: raw };
        }
      }

      const title = String(data.title || 'EPBF');
      const options = {
        body: String(data.body || 'Nieuwe wedstrijdinformatie beschikbaar.'),
        icon: './assets/epbf-icon.png',
        badge: './assets/epbf-icon.png',
        // Gebruik een unieke tag als de afzender geen tag meegeeft.
        tag: data.tag ? String(data.tag) : `epbf-${Date.now()}`,
        renotify: Boolean(data.renotify),
        data: { url: typeof data.url === 'string' ? data.url : './' }
      };

      console.log('[EPBF SW] Melding tonen', { title, body: options.body, tag: options.tag });
      await self.registration.showNotification(title, options);
      console.log('[EPBF SW] showNotification geslaagd');
    } catch (error) {
      console.error('[EPBF SW] Pushmelding mislukt:', error);
      throw error;
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || './', self.registration.scope);
    // Alleen links binnen de eigen PWA openen.
    if (target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) {
      target.href = self.registration.scope;
    }
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(target.href);
      return;
    }
    await clients.openWindow(target.href);
  })());
});
