'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Silently refetches server data when the tab regains focus.
 *
 * Feature flags and other server-rendered state can change from a
 * different app/tab (e.g. a flag toggled in Console) with no push
 * channel back to this app. Revalidating on focus catches it up without
 * requiring a manual page reload.
 */
export function FocusRevalidate() {
  const router = useRouter()

  useEffect(() => {
    function handleFocus() {
      router.refresh()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') router.refresh()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

  return null
}
