'use client'

import { useState } from 'react'
import { LogOut } from '@876/ui/icons'

import { authClient } from '@/lib/auth/client'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { resetAnalyticsIdentity, track } from '@/lib/analytics/track'
import { useUserStore } from '@/stores/user'

export function LogoutButton() {
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    const user = useUserStore.getState().user
    if (user) {
      track(AnalyticsEvent.AuthLogoutClicked, {
        properties: { user_id: user.id },
      })
    }

    useUserStore.getState().clearUser()
    await authClient.auth.logout()
    if (user) {
      track(AnalyticsEvent.AuthLogoutSucceeded, {
        properties: { user_id: user.id },
      })
      track(AnalyticsEvent.SessionEnded, {
        properties: { user_id: user.id, reason: 'logout' },
      })
    }
    resetAnalyticsIdentity()
    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleLogout}
      className="border-border bg-background hover:bg-accent inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
          Logging out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Log out
        </>
      )}
    </button>
  )
}
