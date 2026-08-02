'use client'

import { useState } from 'react'
import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/core/utils'

import { request } from '@/lib/client/request'

/**
 * Clears the active 876 session before navigating to login, preventing the
 * infinite redirect loop that occurs when an enterprise-realm session is still
 * active and the login page immediately bounces back to /access-denied.
 */
export function ChangeAccountAction() {
  const [busy, setBusy] = useState(false)

  async function handleChangeAccount() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = `/login?${AUTH_RETURN_TO_PARAM}=/app`
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleChangeAccount}
      className={cn(buttonVariants({ variant: 'outline' }))}
    >
      {busy ? 'Signing out...' : 'Change account'}
    </button>
  )
}
