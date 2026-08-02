'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'

import { client } from '@/lib/client'

export function SubscriptionBillingItemAction({
  subscriptionId,
  resourceId,
  kind,
}: {
  subscriptionId: string
  resourceId: string
  kind: 'charge' | 'discount'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const label = kind === 'charge' ? 'Void' : 'Remove'
  const pendingLabel = kind === 'charge' ? 'Voiding…' : 'Removing…'

  return (
    <div className="mt-2 flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          if (
            !window.confirm(
              kind === 'charge'
                ? 'Void this unbilled charge? Its audit history will be retained.'
                : 'Remove this discount from future invoices?'
            )
          )
            return
          startTransition(async () => {
            const result =
              kind === 'charge'
                ? await client.subscriptions.voidCharge(
                    subscriptionId,
                    resourceId
                  )
                : await client.subscriptions.removeDiscount(
                    subscriptionId,
                    resourceId
                  )
            if (result.error) {
              setMessage(result.error.message)
              return
            }
            router.refresh()
          })
        }}
      >
        {isPending ? pendingLabel : label}
      </Button>
      {message ? (
        <p role="status" className="text-destructive max-w-56 text-xs">
          {message}
        </p>
      ) : null}
    </div>
  )
}
