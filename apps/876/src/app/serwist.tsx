'use client'

import { SerwistProvider } from '@serwist/turbopack/react'
import { useEffect, type ReactNode } from 'react'

const shouldRegister =
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_PWA_TEST === '1'

function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Serwist's `defaultCache` serves `/_next/static/**.js` CacheFirst for a
    // day. Turbopack reuses those dev chunk paths across compiles, so an
    // edited component keeps hydrating from an earlier build — the page
    // renders correctly from the server, then flips back to stale markup on
    // hydration. Clear anything a previous dev session installed.
    void Promise.all([
      navigator.serviceWorker.getRegistrations(),
      'caches' in globalThis ? caches.keys() : Promise.resolve([]),
    ]).then(async ([registrations, cacheKeys]) => {
      if (registrations.length === 0 && cacheKeys.length === 0) return

      await Promise.all([
        ...registrations.map((registration) => registration.unregister()),
        ...cacheKeys.map((key) => caches.delete(key)),
      ])
      window.location.reload()
    })
  }, [])

  return null
}

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  if (!shouldRegister)
    return (
      <>
        <ServiceWorkerCleanup />
        {children}
      </>
    )

  return <SerwistProvider swUrl="/sw.js">{children}</SerwistProvider>
}
