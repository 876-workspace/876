'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { formatMinorAmountInput, parseMinorAmountInput } from '@/lib/format'

type PriceOption = {
  id: string
  addonId: string | null
  label: string
  unitAmount: string
  description: string
  isTaxable: boolean
}

export function SubscriptionChargeForm({
  subscriptionId,
  currency,
  decimalPlaces,
  taxBehavior,
  prices,
}: {
  subscriptionId: string
  currency: string
  decimalPlaces: number
  taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  prices: PriceOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isTaxable, setIsTaxable] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="876-card mx-auto max-w-3xl space-y-6 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const unitAmount = parseMinorAmountInput(amount, decimalPlaces)
        if (!description.trim() || unitAmount === null) {
          setMessage('Enter a description and valid amount.')
          return
        }
        const selected = prices.find((price) => price.id === selectedPriceId)
        startTransition(async () => {
          const result = await client.subscriptions.createCharge(
            subscriptionId,
            {
              addonId: selected?.addonId ?? null,
              priceId: selected?.id ?? null,
              description: description.trim(),
              quantity: Number(data.get('quantity')),
              unitAmount,
              currency,
              taxBehavior,
              isTaxable,
              invoiceBehavior: String(data.get('invoiceBehavior')) as
                | 'INVOICE_IMMEDIATELY'
                | 'NEXT_INVOICE',
              serviceAt: null,
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
        <h1 className="876-page-title">Add one-time charge</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a one-time add-on or enter a custom charge. Invoice now or
          carry it to the next renewal invoice.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="charge-price">Add-on price (optional)</Label>
        <NativeSelect
          id="charge-price"
          value={selectedPriceId}
          onChange={(event) => {
            const id = event.target.value
            setSelectedPriceId(id)
            const price = prices.find((entry) => entry.id === id)
            if (price) {
              setDescription(price.description)
              setAmount(formatMinorAmountInput(price.unitAmount, decimalPlaces))
              setIsTaxable(price.isTaxable)
            }
          }}
          className="w-full"
        >
          <NativeSelectOption value="">Custom charge</NativeSelectOption>
          {prices.map((price) => (
            <NativeSelectOption key={price.id} value={price.id}>
              {price.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="charge-description">Description</Label>
        <Textarea
          id="charge-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="charge-quantity">Quantity</Label>
          <Input
            id="charge-quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="charge-amount">Unit amount ({currency})</Label>
          <Input
            id="charge-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceBehavior">Invoice timing</Label>
          <NativeSelect
            id="invoiceBehavior"
            name="invoiceBehavior"
            className="w-full"
          >
            <NativeSelectOption value="INVOICE_IMMEDIATELY">
              Create invoice immediately
            </NativeSelectOption>
            <NativeSelectOption value="NEXT_INVOICE">
              Add to next renewal invoice
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <label className="border-border flex items-center gap-3 rounded-lg border p-4 text-sm">
          <input
            name="isTaxable"
            type="checkbox"
            checked={isTaxable}
            onChange={(event) => setIsTaxable(event.target.checked)}
            className="size-4"
          />{' '}
          Taxable ({taxBehavior.toLowerCase()})
        </label>
      </div>
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
          {isPending ? 'Adding…' : 'Add charge'}
        </Button>
      </div>
    </form>
  )
}
