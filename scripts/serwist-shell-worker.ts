/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from 'serwist'
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const cacheId = process.env.SERWIST_CACHE_ID
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    method: 'GET',
    handler: new CacheFirst({
      cacheName: `${cacheId}-next-static`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    // Same-origin only. A catch-all routes cross-origin loads — R2 logo
    // images, Sentry, any CDN — through the worker too, and NetworkOnly
    // turns a transient fetch failure into a hard `no-response` error. The
    // offline fallback only covers documents, so an image fails outright and
    // renders as a broken-image icon that survives reloads. Unmatched
    // requests skip the worker and let the browser fetch them normally.
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

serwist.addEventListeners()
