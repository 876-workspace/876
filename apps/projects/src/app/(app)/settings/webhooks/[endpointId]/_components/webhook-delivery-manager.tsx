'use client'

import type { WebhookDelivery } from '@876/projects-ui/platform/types'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { webhookEndpointsClient } from '@/lib/client'

type Props = {
  deliveries: readonly WebhookDelivery[]
}

export function WebhookDeliveryManager({ deliveries }: Props) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [replayedId, setReplayedId] = useState<string | null>(null)

  const replayable = deliveries.filter((delivery) => delivery.status === 'failed')
  if (replayable.length === 0) return null

  async function replay(deliveryId: string) {
    if (pendingId) return
    setPendingId(deliveryId)
    setError(null)
    setReplayedId(null)
    const result = await webhookEndpointsClient.replay(deliveryId)
    setPendingId(null)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/webhook-replay-failed',
        message: result.error?.message ?? 'The delivery could not be replayed.',
      })
      return
    }
    setReplayedId(deliveryId)
    router.refresh()
  }

  return (
    <section aria-label="Replay failed deliveries" className="flex flex-col gap-2">
      {error ? (
        <AppError title="Delivery not replayed" error={error} variant="banner" />
      ) : null}
      {replayedId ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Delivery replayed.
        </p>
      ) : null}
      {replayable.map((delivery) => (
        <div
          key={delivery.id}
          data-slot="webhook-delivery-manage-row"
          className="flex flex-wrap items-center gap-2 rounded-md border px-4 py-2.5"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-xs">
            {delivery.eventType} · attempt {delivery.attempt}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingId === delivery.id}
            onClick={() => void replay(delivery.id)}
          >
            Replay
          </Button>
        </div>
      ))}
    </section>
  )
}
