/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from 'serwist'
import {
  BackgroundSyncPlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const cacheId = process.env.SERWIST_CACHE_ID || '876-invoice-app'

// 1. Background Sync Queue for offline mutations (e.g. saving invoice drafts offline)
const bgSyncPlugin = new BackgroundSyncPlugin('invoice-offline-mutations', {
  maxRetentionTime: 24 * 60, // Retry failed requests for up to 24 hours (in minutes)
})

const runtimeCaching: RuntimeCaching[] = [
  // 2. Next.js Static Chunks (immutable, cache first with LRU expiration)
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    method: 'GET',
    handler: new CacheFirst({
      cacheName: `${cacheId}-next-static`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 256,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  // 3. Web fonts (Google Fonts & static fonts)
  {
    matcher: ({ url }) =>
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com',
    method: 'GET',
    handler: new CacheFirst({
      cacheName: `${cacheId}-fonts`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  // 4. Offline-safe draft API mutations (queued with BackgroundSync)
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin &&
      (url.pathname.startsWith('/api/invoices/draft') ||
        url.pathname.startsWith('/api/expenses/draft')),
    method: 'POST',
    handler: new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
  },
  // 5. Dynamic same-origin requests (NetworkOnly - never cache sensitive tenant/financial data)
  {
    matcher: ({ sameOrigin }) => sameOrigin,
    method: 'GET',
    handler: new NetworkOnly(),
  },
]

const serwist = new Serwist({
  cacheId,
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

// Client-to-worker message communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// Web Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || '876 Invoice'
    const options: NotificationOptions = {
      body: data.body || 'You have a new notification from 876 Invoice.',
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      data: { url: data.url || '/invoices' },
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    const text = event.data.text()
    event.waitUntil(
      self.registration.showNotification('876 Invoice', {
        body: text,
        icon: '/pwa/icon-192.png',
        data: { url: '/invoices' },
      })
    )
  }
})

// Notification click navigation handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/invoices'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

serwist.addEventListeners()
