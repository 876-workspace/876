'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * The condition that produced this screen is transient — the platform was
 * unreachable for one render — but the screen itself has no data of its own, so
 * nothing re-checks and the viewer stays parked here until they click. Re-run
 * the route when the tab regains focus and on a widening interval; the page's
 * server component redirects away as soon as 876 answers again.
 */
export function RecoveryWatcher() {
  const router = useRouter()

  useEffect(() => {
    let delay = 5_000
    let timer: ReturnType<typeof setTimeout>

    const poll = () => {
      router.refresh()
      delay = Math.min(delay * 2, 60_000)
      timer = setTimeout(poll, delay)
    }

    timer = setTimeout(poll, delay)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
