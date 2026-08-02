'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'

import { client } from '@/lib/client'

export function SubscriptionInvoiceActions({
  subscriptionId,
}: {
  subscriptionId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setMessage(null)
          startTransition(async () => {
            const result = await client.subscriptions.generateInvoice(
              subscriptionId,
              { advance: true, draft: true }
            )
            if (result.error) {
              setMessage(result.error.message)
              return
            }

            setMessage('Advance draft invoice generated.')
            router.refresh()
          })
        }}
      >
        {isPending ? 'Generating…' : 'Generate advance draft'}
      </Button>
    </div>
  )
}
