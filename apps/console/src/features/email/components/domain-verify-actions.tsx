'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { EmailDomainStatus } from '@876/communications/contracts'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'

import { emailDomains } from '@/lib/client/email'

export interface VerifyDomain {
  id: string
  name: string
  status: EmailDomainStatus
}

/** Operator verify actions for sending domains that are not verified yet. */
export function DomainVerifyActions({
  organizationId,
  domains,
}: {
  organizationId: string
  domains: VerifyDomain[]
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )
  const [, startTransition] = useTransition()

  const actionable = domains.filter((domain) => domain.status !== 'verified')
  if (actionable.length === 0) return null

  return (
    <div className="876-card space-y-3 p-5">
      <h2 className="text-sm font-medium">Verify domains</h2>
      {error ? (
        <AppError
          title="Domain verification failed"
          error={error}
          variant="inline"
          showCode
        />
      ) : null}
      <ul className="space-y-2">
        {actionable.map((domain) => (
          <li key={domain.id} className="flex flex-wrap items-center gap-3">
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
                  const result = await emailDomains.verify(
                    organizationId,
                    domain.id
                  )
                  setPendingId(null)
                  if (result.error) {
                    setError({
                      code: result.error.code,
                      message: result.error.message,
                    })
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
