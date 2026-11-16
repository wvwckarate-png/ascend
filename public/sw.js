// Ascend's background helper. Its only jobs: show a reminder when one arrives, and open Ascend when it is tapped.
// It deliberately keeps no copies of pages or study data on the device.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = typeof data.title === 'string' && data.title ? data.title : 'Ascend';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'ascend-daily',            // a newer reminder replaces an unread older one instead of stacking
    data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of open) { if ('focus' in client) { await client.focus(); if ('navigate' in client) { try { await client.navigate(url); } catch {} } return; } }
    await self.clients.openWindow(url);
  })());
});
