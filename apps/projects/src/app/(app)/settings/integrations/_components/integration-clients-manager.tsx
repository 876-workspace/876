'use client'

import type { IntegrationClient } from '@876/projects-ui/platform/types'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { integrationClientsClient } from '@/lib/client'

type Props = {
  clients: readonly IntegrationClient[]
}

export function IntegrationClientsManager({ clients }: Props) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const active = clients.filter((client) => client.revokedAt === null)
  if (active.length === 0) return null

  async function revoke(clientId: string) {
    if (pendingId) return
    setPendingId(clientId)
    setError(null)
    const result = await integrationClientsClient.revoke(clientId)
    setPendingId(null)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/integration-revoke-failed',
        message: result.error?.message ?? 'The client could not be revoked.',
      })
      return
    }
    router.refresh()
  }

  return (
    <section aria-label="Revoke integration clients" className="flex flex-col gap-2">
      {error ? (
        <AppError title="Client not revoked" error={error} variant="banner" />
      ) : null}
      {active.map((client) => (
        <div
          key={client.id}
          data-slot="integration-client-manage-row"
          className="flex flex-wrap items-center gap-2 rounded-md border px-4 py-2.5"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {client.name}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingId === client.id}
            onClick={() => void revoke(client.id)}
          >
            Revoke
          </Button>
        </div>
      ))}
    </section>
  )
}
