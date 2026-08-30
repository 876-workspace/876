/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
  SerwistPlugin,
} from 'serwist'
import { disableNavigationPreload, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * Re-issues a navigation as an ordinary same-origin GET that keeps
 * `redirect: "manual"`.
 *
 * A navigation request cannot be handed to `fetch()` together with a
 * `RequestInit`, so the worker's fetch follows redirects itself and resolves
 * with a response whose `redirected` flag is set. The browser refuses such a
 * response for a navigation ("a redirected response was used for a request
 * whose redirect mode is not 'follow'") and fails the navigation outright —
 * the strategy reports `no-response` and the page never loads. That is what
 * broke Console's entry point: `/` redirects a signed-out visitor to
 * `/login`, so the very first navigation was unrecoverable.
 *
 * Fetching with `redirect: "manual"` returns an opaque redirect instead. The
 * worker cannot read it, but it carries the internal response the browser
 * needs, and passing it back is exactly how a service worker is meant to hand
 * a redirect on.
 */
const navigationRequestPlugin: SerwistPlugin = {
  requestWillFetch: async ({ request }) =>
    request.mode === 'navigate'
      ? new Request(request.url, {
          method: 'GET',
          headers: request.headers,
          mode: 'same-origin',
          credentials: 'include',
          redirect: 'manual',
        })
      : request,
}

const cacheId = process.env.SERWIST_CACHE_ID
const runtimeCaching: RuntimeCaching[] = [
  // Next serves the document and its RSC payload from the network. Caching
  // client chunks independently can combine fresh server markup with a stale
  // React tree after a deployment, causing hydration failures. The browser's
  // normal immutable asset cache still applies to hashed chunks.
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    method: 'GET',
    handler: new NetworkOnly(),
  },
  {
    // Navigations are re-issued as a plain `redirect: "manual"` request (see
    // `navigationRequestPlugin`). Without it a redirecting entry point — the
    // Console dashboard sending a signed-out visitor to `/login` — comes back
    // as a followed response, which the browser refuses for a navigation and
    // turns into a hard `no-response` error instead of a redirect.
    matcher: ({ sameOrigin, request }) =>
      sameOrigin && request.mode === 'navigate',
    method: 'GET',
    handler: new NetworkOnly({ plugins: [navigationRequestPlugin] }),
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

// Navigation preload is issued by the browser before the worker runs, so the
// plugin above cannot give it `redirect: "manual"` — a preloaded navigation
// that redirects comes back already followed and fails the same way. The flag
// lives on the registration rather than the script, so turning it off has to
// be an explicit call: a worker that merely stops asking for it inherits the
// previous version's enabled state.
disableNavigationPreload()

serwist.addEventListeners()
