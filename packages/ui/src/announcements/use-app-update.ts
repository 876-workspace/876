'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Watches the service worker registration for a version that has installed and
 * is waiting to take over, so the app can offer a refresh instead of silently
 * running yesterday's bundle (or reloading under the user).
 *
 * `apply()` tells the waiting worker to skip waiting; the `controllerchange`
 * listener registered by the app's PWA provider performs the reload.
 */
export function useAppUpdate(): {
  updateAvailable: boolean
  apply: () => void
} {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
      return

    let cancelled = false

    void navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return

      if (registration.waiting) setWaiting(registration.waiting)

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          // A first install has no controller — that is not an update, it is
          // the worker taking over for the first time.
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          )
            setWaiting(installing)
        })
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  const apply = useCallback(() => {
    waiting?.postMessage({ type: 'SKIP_WAITING' })
  }, [waiting])

  return { updateAvailable: waiting !== null, apply }
}
