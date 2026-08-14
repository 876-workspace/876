'use client'

import Link from 'next/link'
import { useState } from 'react'

import { request } from '@/lib/client/request'

/**
 * No-access actions for 876 Billing. Sign out clears the session BEFORE
 * navigating — a plain link to /login would leave the session active and bounce
 * straight back here (ADR-013 — no-access UX standard). Billing authenticates in
 * the enterprise realm through its own /api/auth bridge, the same one the shell
 * user menu logs out through.
 */
export function NoAccessActions() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
      <Link
        href={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
        className="border-border bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-colors"
      >
        Go to my 876 account
      </Link>
    </div>
  )
}
