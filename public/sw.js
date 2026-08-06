// PLDS Service Worker — Push Notifications & Offline Cache
const CACHE_NAME = 'plds-v1'
const OFFLINE_URL = '/offline'

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/dashboard', '/manifest.json'])
    ).then(() => self.skipWaiting())
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'PLDS Alert', body: 'You have a new notification', tag: 'alert', url: '/dashboard' }

  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  const options = {
    body: data.body,
    tag: data.tag || 'alert',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: { url: data.url || '/dashboard' },
    requireInteraction: data.tag === 'AWOL' || data.tag === 'OVERDUE',
    vibrate: data.tag === 'AWOL' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// ─── Fetch — Network-first for API, Cache-first for static ───────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return // never cache API calls

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r || caches.match(OFFLINE_URL))
    )
  )
})
