'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'
import type { TenantCreateInput, TenantProvisioned } from '@/types/tenant'

export function SetupButton({ name, slug }: { name: string; slug: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setUp() {
    if (busy) return
    setBusy(true)
    setError(null)

    const activationResult = await request<{ alreadyActive?: boolean }>(
      '/api/activate',
      { method: 'POST' }
    )
    if (activationResult.error) {
      setError(activationResult.error.message)
      setBusy(false)
      return
    }

    const tenantParams: TenantCreateInput = {
      name,
      slug,
      defaultCurrency: 'JMD',
    }
    const tenantResult = await request<TenantProvisioned>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantParams),
    })
    if (tenantResult.error) {
      setError(tenantResult.error.message)
      setBusy(false)
      return
    }

    window.location.assign('/')
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void setUp()}
        disabled={busy}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Setting up…' : 'Set up Billing workspace'}
      </button>
      {error ? (
        <p className="text-destructive text-center text-xs">{error}</p>
      ) : null}
    </div>
  )
}
