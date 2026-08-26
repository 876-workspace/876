'use client'

import { useState } from 'react'

import { request } from '@/lib/client/request'
import type { TenantCreateInput, TenantProvisioned } from '@/types/tenant'

/**
 * Activation always runs; workspace creation only when there is no workspace
 * yet. The two cases are separate prop shapes so the activate-only card cannot
 * be handed a currency it would never use — an org whose workspace was opened
 * by a dependent product (Couriers) has already fixed its currency.
 */
export type SetupButtonProps =
  | { workspaceExists: true }
  | {
      workspaceExists: false
      name: string
      slug: string
      /** Inherited from the organization — the workspace never picks its own. */
      defaultCurrency: string
    }

export function SetupButton(props: SetupButtonProps) {
  const { workspaceExists } = props
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

    if (props.workspaceExists) {
      window.location.assign('/')
      return
    }

    const tenantParams: TenantCreateInput = {
      name: props.name,
      slug: props.slug,
      defaultCurrency: props.defaultCurrency,
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
        {busy
          ? 'Setting up…'
          : workspaceExists
            ? 'Activate 876 Billing'
            : 'Set up Billing workspace'}
      </button>
      {error ? (
        <p className="text-destructive text-center text-xs">{error}</p>
      ) : null}
    </div>
  )
}
