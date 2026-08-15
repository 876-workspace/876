'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { request } from '@/lib/client/request'

type CreatedOrganization = {
  object: 'onboarding_organization'
  organization_id: string
}

/**
 * Org-creation step for a signed-in account with no organization — the
 * brand-new-signup case Billing previously stranded on `/no-access`. On success
 * it reloads `/get-started`, where the account now has an owner membership and
 * the existing workspace-provisioning step takes over.
 */
export function CreateOrganization({
  suggestedName,
}: {
  suggestedName: string
}) {
  const router = useRouter()
  const [name, setName] = useState(suggestedName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = busy || !name.trim()

  async function createOrganization() {
    if (disabled) return
    setBusy(true)
    setError(null)

    const result = await request<CreatedOrganization>(
      '/api/onboarding/organization',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      }
    )

    if (result.error) {
      if (result.error.code === 'auth/session-invalid') {
        window.location.assign('/login')
        return
      }

      setError(result.error.message)
      setBusy(false)
      return
    }

    // Re-run the server component: the account now owns the org, so the
    // workspace-provisioning step renders in place.
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="organization-name"
        className="text-foreground block text-sm font-medium"
      >
        Organization name
      </label>
      <input
        id="organization-name"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void createOrganization()
        }}
        autoComplete="organization"
        disabled={busy}
        className="border-border bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => void createOrganization()}
        disabled={disabled}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 flex h-10 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Continue'}
      </button>
      {error ? (
        <p className="text-destructive text-center text-xs">{error}</p>
      ) : null}
    </div>
  )
}
