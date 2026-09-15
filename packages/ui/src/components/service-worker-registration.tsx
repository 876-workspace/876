'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    const reloadWhenBackOnline = () => window.location.reload()
    window.addEventListener('online', reloadWhenBackOnline)

    const shouldRegister =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_PWA_TEST === '1'

    if ('serviceWorker' in navigator && shouldRegister) {
      let reloadedForWorkerUpdate = false
      const reloadForWorkerUpdate = () => {
        if (reloadedForWorkerUpdate) return

        reloadedForWorkerUpdate = true
        window.location.reload()
      }

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        reloadForWorkerUpdate
      )
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })

      return () => {
        window.removeEventListener('online', reloadWhenBackOnline)
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          reloadForWorkerUpdate
        )
      }
    }

    if ('serviceWorker' in navigator) {
      // A development service worker can retain application assets from an
      // earlier compile. Remove registrations and caches so local hydration
      // always uses the current development build.
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
