'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    const reloadWhenBackOnline = () => window.location.reload()
    window.addEventListener('online', reloadWhenBackOnline)

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    } else if ('serviceWorker' in navigator) {
      // A development service worker can serve client chunks from an earlier
      // compile, leaving React with mismatched server and client component props.
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
    }

    return () => window.removeEventListener('online', reloadWhenBackOnline)
  }, [])

  return null
}
