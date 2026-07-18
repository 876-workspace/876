'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

export function SubscriptionBulkInvoiceForm({
  subscriptions,
}: {
  subscriptions: Array<{ id: string; label: string; invoiceMode: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="876-card overflow-hidden">
        <div className="divide-border divide-y">
          {subscriptions.map((subscription) => (
            <label
              key={subscription.id}
              className="flex items-center gap-4 px-5 py-4"
            >
              <input
                type="checkbox"
                checked={selected.includes(subscription.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, subscription.id]
                      : current.filter((id) => id !== subscription.id)
                  )
                }
                className="size-4"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {subscription.label}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {subscription.invoiceMode}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <form
        className="876-card flex flex-wrap items-end gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          if (!selected.length) {
            setMessage('Select at least one subscription.')
            return
          }
          startTransition(async () => {
            const value = String(data.get('invoiceMode'))
            const result = await client.subscriptions.bulkUpdateInvoiceMode({
              subscriptionIds: selected,
              invoiceModeOverride:
                value === 'INHERIT'
                  ? null
                  : (value as 'AUTO_FINALIZE' | 'DRAFT'),
            })
            if (result.error) {
              setMessage(result.error.message)
              return
            }
            setMessage(
              `Updated ${result.data?.updated ?? selected.length} subscriptions.`
            )
            setSelected([])
            router.refresh()
          })
        }}
      >
        <div className="min-w-56 flex-1">
          <NativeSelect name="invoiceMode" className="w-full">
            <NativeSelectOption value="INHERIT">
              Workspace default
            </NativeSelectOption>
            <NativeSelectOption value="AUTO_FINALIZE">
              Finalize automatically
            </NativeSelectOption>
            <NativeSelectOption value="DRAFT">Create draft</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Updating…' : `Update ${selected.length} selected`}
        </Button>
      </form>
      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}
