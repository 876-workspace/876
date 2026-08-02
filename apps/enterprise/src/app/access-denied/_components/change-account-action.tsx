'use client'

import { useState } from 'react'
import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { request } from '@/lib/client/request'

/**
 * Clears the active 876 session then navigates to the enterprise login page.
 * A plain <Link> would land on the login page while the consumer session is
 * still active, causing the login page to redirect straight back to /org and
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
      window.location.href = `/login?${AUTH_RETURN_TO_PARAM}=/org`
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleChangeAccount}
      className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors"
    >
      {busy ? 'Signing out...' : 'Change account'}
    </button>
  )
}
