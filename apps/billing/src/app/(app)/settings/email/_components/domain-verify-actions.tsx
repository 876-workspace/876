'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { EmailDomainStatus } from '@876/communications/contracts'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'

import { client } from '@/lib/client'

interface VerifyDomain {
  id: string
  name: string
  status: EmailDomainStatus
}

/** Host-owned verify actions for domains that still need it. */
export function DomainVerifyActions({ domains }: { domains: VerifyDomain[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const actionable = domains.filter((domain) => domain.status !== 'verified')
  if (actionable.length === 0) return null

  return (
    <div className="876-card space-y-3 p-5">
      <h2 className="text-sm font-medium">Verify domains</h2>
      {error ? (
        <AppError
          variant="inline"
          error={{ code: 'email/verify-failed', message: error }}
        />
      ) : null}
      <ul className="space-y-2">
        {actionable.map((domain) => (
          <li
            key={domain.id}
            className="flex flex-wrap items-center gap-3"
          >
            <span className="min-w-0 flex-1 font-medium">{domain.name}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingId !== null}
              aria-label={`Verify ${domain.name}`}
              onClick={() => {
                setError(null)
                setPendingId(domain.id)
                startTransition(async () => {
                  const result = await client.emailDomains.verify(domain.id)
                  setPendingId(null)
                  if (result.error) {
                    setError(result.error.message)
                    return
                  }
                  router.refresh()
                })
              }}
            >
              {pendingId === domain.id ? 'Verifying…' : 'Verify'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
