'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { request } from '@/lib/client/request'

/** Clears the blocked consumer session before returning to Enterprise login. */
export function ChangeAccountAction() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleChangeAccount() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace(`/login?${AUTH_RETURN_TO_PARAM}=/`)
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
