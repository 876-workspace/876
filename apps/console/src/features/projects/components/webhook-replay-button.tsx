'use client'

import { Button } from '@876/ui/button'
import { useState } from 'react'

type ReplayState = 'idle' | 'pending' | 'succeeded' | 'failed'

/**
 * Operator replay for one failed webhook delivery.
 * Posts to the Console replay route, which enforces `requireConsolePermission`
 * and writes the audit event before touching the operator client.
 */
export function WebhookReplayButton({
  organizationId,
  deliveryId,
}: {
  organizationId: string
  deliveryId: string
}) {
  const [state, setState] = useState<ReplayState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function replay() {
    setState('pending')
    setError(null)
    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/projects/webhook-deliveries/${encodeURIComponent(deliveryId)}/replay`,
        { method: 'POST' }
      )
      const payload = (await response.json().catch(() => null)) as {
        data: unknown
        error: { message?: string } | null
      } | null
      if (!response.ok || !payload || payload.error) {
        setState('failed')
        setError(payload?.error?.message ?? 'Replay failed.')
        return
      }
      setState('succeeded')
    } catch {
      setState('failed')
      setError('Replay failed.')
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={state === 'pending' || state === 'succeeded'}
        onClick={replay}
      >
        {state === 'pending'
          ? 'Replaying…'
          : state === 'succeeded'
            ? 'Replayed'
            : 'Replay'}
      </Button>
      {state === 'failed' && error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : null}
    </span>
  )
}
