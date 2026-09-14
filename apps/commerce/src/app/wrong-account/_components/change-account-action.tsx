'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { request } from '@/lib/client/request'

/** Clears the consumer session before returning to Commerce's login page. */
export function ChangeAccountAction() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleChangeAccount() {
    if (busy) return
    setBusy(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/login')
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
