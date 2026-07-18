'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'

import { client } from '@/lib/client'

export function RetryRunButton({ runId }: { runId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null)
            const result = await client.provisioningRuns.retry(runId)
            if (result.error) {
              setMessage(result.error.message)
              return
            }
            setMessage('Run queued for retry.')
            router.refresh()
          })
        }
      >
        {isPending ? 'Queuing…' : 'Retry run'}
      </Button>
      {message ? (
        <span className="text-muted-foreground text-xs" role="status">
          {message}
        </span>
      ) : null}
    </div>
  )
}

export function ReconcileRunsButton({
  appId,
  organizationId,
}: {
  appId?: string
  organizationId?: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {message ? (
        <span className="text-muted-foreground text-xs" role="status">
          {message}
        </span>
      ) : null}
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          const scope =
            appId || organizationId
              ? 'the filtered scope'
              : 'all organizations and applications'
          if (!window.confirm(`Reconcile provisioning for ${scope}?`)) return
          startTransition(async () => {
            setMessage(null)
            const result = await client.provisioningRuns.reconcile({
              app_id: appId,
              organization_id: organizationId,
            })
            if (result.error || !result.data) {
              setMessage(result.error?.message ?? 'Reconciliation failed.')
              return
            }
            setMessage(
              `Examined ${result.data.examined}; queued ${result.data.enqueued}.`
            )
            router.refresh()
          })
        }}
      >
        {isPending ? 'Reconciling…' : 'Reconcile now'}
      </Button>
    </div>
  )
}
