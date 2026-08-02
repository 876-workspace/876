'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'

/**
 * Sign-out actions for the access-denied screen. Clears the active 876 session
 * via the API logout proxy, then sends the user to the login page so they can
 * authenticate with a different account.
 */
export function AccessDeniedActions() {
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={handleSignOut}
        className="auth-btn auth-btn-primary auth-btn-lg w-full"
      >
        {busy ? (
          <span aria-hidden="true" className="auth-spinner auth-spinner-sm" />
        ) : null}
        Sign in with a different account
      </button>
    </div>
  )
}
