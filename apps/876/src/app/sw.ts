/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker'
import type { PrecacheEntry, SerwistGlobalConfig, SerwistPlugin } from 'serwist'
import { disableNavigationPreload, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Re-issues a navigation as a plain same-origin GET that keeps
// `redirect: "manual"`, so a redirecting entry point survives the worker.
// A navigate-mode request cannot carry a RequestInit, so the worker's own
// fetch follows the hop and returns a response the browser then refuses for a
// navigation, failing the load outright. See scripts/serwist-shell-worker.ts,
// which carries the full reasoning for the shared workers.
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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Ahead of `defaultCache`, whose same-origin catch-all is a NetworkFirst
    // that also matches navigations — so a redirect was both mishandled and a
    // candidate for caching the destination's HTML under the original URL.
    {
      matcher: ({ sameOrigin, request }) =>
        sameOrigin && request.mode === 'navigate',
      method: 'GET',
      handler: new NetworkOnly({ plugins: [navigationRequestPlugin] }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

// The browser issues a navigation preload before the worker runs, so the
// plugin above cannot give it `redirect: "manual"`. The flag lives on the
// registration, so it has to be turned off explicitly rather than by omission.
disableNavigationPreload()

serwist.addEventListeners()
