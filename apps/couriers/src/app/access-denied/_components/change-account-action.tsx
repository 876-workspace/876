'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'

/**
 * Clears the active 876 session then navigates to the couriers login page.
 * A plain <Link> would land on the login page while the consumer session is
 * still active, causing the login page to redirect straight back to / and
 * into an infinite /access-denied loop.
 */
export function ChangeAccountAction() {
  const [busy, setBusy] = useState(false)

  async function handleChangeAccount() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleChangeAccount}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors"
    >
      {busy ? 'Signing out...' : 'Change account'}
    </button>
  )
}
