'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'

export function SetupButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSetup() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const result = await request<unknown>('/api/manage/activate', {
        method: 'POST',
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      window.location.assign('/onboarding')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleSetup()}
        disabled={busy}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Setting up…' : 'Set up workspace'}
      </button>
      {error && <p className="text-destructive text-center text-xs">{error}</p>}
    </div>
  )
}
