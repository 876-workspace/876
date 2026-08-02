'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { parseMinorAmountInput } from '@/lib/format'

export function SubscriptionDiscountForm({
  subscriptionId,
  currency,
  decimalPlaces,
  items,
}: {
  subscriptionId: string
  currency: string
  decimalPlaces: number
  items: Array<{ id: string; label: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'PROMOTION' | 'MANUAL'>('PROMOTION')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="876-card mx-auto max-w-3xl space-y-6 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const discountType = String(data.get('discountType')) as
          | 'PERCENTAGE'
          | 'AMOUNT'
        const amountOff =
          discountType === 'AMOUNT'
            ? parseMinorAmountInput(
                String(data.get('value') ?? ''),
                decimalPlaces
              )
            : null
        const percentOff =
          discountType === 'PERCENTAGE' ? Number(data.get('value')) : null
        startTransition(async () => {
          const result = await client.subscriptions.createDiscount(
            subscriptionId,
            mode === 'PROMOTION'
              ? {
                  promotionCode: String(data.get('promotionCode') ?? '').trim(),
                }
              : {
                  scope: String(data.get('scope')) as 'TRANSACTION' | 'ITEM',
                  subscriptionItemId:
                    String(data.get('subscriptionItemId') ?? '') || null,
                  discountType,
                  percentOff,
                  amountOff,
                  currency: discountType === 'AMOUNT' ? currency : null,
                  duration: String(data.get('duration')) as
                    | 'ONCE'
                    | 'FOREVER'
                    | 'REPEATING',
                  durationInCycles: String(data.get('durationInCycles') ?? '')
                    ? Number(data.get('durationInCycles'))
                    : null,
                  reason: String(data.get('reason') ?? '').trim() || null,
                }
          )
          if (result.error) {
            setMessage(result.error.message)
            return
          }
          router.push(`/subscriptions/${subscriptionId}/billing`)
          router.refresh()
        })
      }}
    >
      <div>
        <h1 className="876-page-title">Apply discount</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Redeem an eligible promotion code or grant a direct transaction or
          item discount with an auditable reason.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'PROMOTION' ? 'default' : 'outline'}
          onClick={() => setMode('PROMOTION')}
        >
          Promotion code
        </Button>
        <Button
          type="button"
          variant={mode === 'MANUAL' ? 'default' : 'outline'}
          onClick={() => setMode('MANUAL')}
        >
          Manual discount
        </Button>
      </div>
      {mode === 'PROMOTION' ? (
        <div className="space-y-2">
          <Label htmlFor="promotionCode">Promotion code</Label>
          <Input id="promotionCode" name="promotionCode" required />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="scope"
            label="Applies to"
            options={[
              ['TRANSACTION', 'Whole invoice'],
              ['ITEM', 'Specific subscription item'],
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="subscriptionItemId">
              Item (for item discounts)
            </Label>
            <NativeSelect
              id="subscriptionItemId"
              name="subscriptionItemId"
              className="w-full"
            >
              <NativeSelectOption value="">Select item…</NativeSelectOption>
              {items.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Select
            name="discountType"
            label="Discount type"
            options={[
              ['PERCENTAGE', 'Percentage'],
              ['AMOUNT', `Fixed amount (${currency})`],
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="discount-value">Value</Label>
            <Input
              id="discount-value"
              name="value"
              type="number"
              min="0"
              step="0.0001"
              required
            />
          </div>
          <Select
            name="duration"
            label="Duration"
            options={[
              ['ONCE', 'Once'],
              ['REPEATING', 'Fixed number of renewals'],
              ['FOREVER', 'Every renewal'],
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="durationInCycles">Renewal cycles</Label>
            <Input
              id="durationInCycles"
              name="durationInCycles"
              type="number"
              min="1"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="discount-reason">Grant reason</Label>
            <Textarea id="discount-reason" name="reason" rows={3} />
          </div>
        </div>
      )}
      {message ? (
        <p role="status" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Applying…' : 'Apply discount'}
        </Button>
      </div>
    </form>
  )
}

function Select({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Array<[string, string]>
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect id={name} name={name} className="w-full">
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
