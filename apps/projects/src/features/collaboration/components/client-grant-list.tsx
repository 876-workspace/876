'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { clientGrantsClient } from '@/lib/client/collaboration'
import type { UiClientGrant } from '@/types/collaboration'

export function ClientGrantList({
  projectId,
  grants,
  canRevoke,
}: {
  projectId: string
  grants: readonly UiClientGrant[]
  canRevoke: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (grants.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No client grants yet
      </p>
    )
  }

  async function revoke(grantId: string) {
    if (pendingId !== null) return
    setPendingId(grantId)
    const result = await clientGrantsClient.revoke(projectId, grantId)
    setPendingId(null)
    if (result.error || !result.data) return
    router.refresh()
  }

  return (
    <ul data-slot="client-grant-list" className="flex flex-col gap-2">
      {grants.map((grant) => (
        <li key={grant.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{grant.userLabel}</span>
            <Badge variant="outline">
              {grant.revokedAt === null ? 'Active' : 'Revoked'}
            </Badge>
          </div>
          {grant.revokedAt === null && canRevoke ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingId !== null}
                onClick={() => revoke(grant.id)}
              >
                {pendingId === grant.id ? 'Revoking…' : 'Revoke'}
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
