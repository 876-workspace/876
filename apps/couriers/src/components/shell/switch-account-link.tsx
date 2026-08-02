'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'

/**
 * Clears the active enterprise (manage) 876 session, then navigates to the
 * couriers login page. A plain <Link href="/login"> would land on the login
 * page while the session is still active, and the login server component would
 * redirect straight back into /get-started — so switching account is impossible
 * without logging out first. Uses the /api/manage-auth bridge because the
 * couriers manage flow authenticates in the enterprise realm.
 */
export function SwitchAccountLink({
  className,
  label = 'Sign in with a different account',
}: {
  className?: string
  label?: string
}) {
  const [busy, setBusy] = useState(false)

  async function handleSwitchAccount() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/manage-auth/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleSwitchAccount}
      className={className}
    >
      {busy ? 'Signing out…' : label}
    </button>
  )
}
