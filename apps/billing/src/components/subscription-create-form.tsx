'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type SelectOption = { label: string; value: string }

export function SubscriptionCreateForm({
  customers,
  prices,
  returnUrl,
  initialCustomerId = '',
}: {
  customers: SelectOption[]
  prices: SelectOption[]
  returnUrl: string
  initialCustomerId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [items, setItems] = useState([{ priceId: '', quantity: 1 }])
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'TRIALING'>('DRAFT')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (
      !customerId ||
      items.length === 0 ||
      items.some(
        (item) =>
          !item.priceId || !Number.isInteger(item.quantity) || item.quantity < 1
      )
    ) {
      setError(
        'Select a customer and recurring price, then enter a valid quantity.'
      )
      return
    }

    setError(null)
    startTransition(async () => {
      const collectionMethod = String(data.get('collectionMethod'))
      const billingTiming = String(data.get('billingTiming'))
      const prorationBehavior = String(data.get('prorationBehavior'))
      const taxBehavior = String(data.get('taxBehavior'))
      const renewalPricingPolicy = String(data.get('renewalPricingPolicy'))
      const advanceBilling = String(data.get('advanceBilling'))
      const result = await client.subscriptions.create({
        customerId,
        status,
        items,
        ...(collectionMethod === 'INHERIT'
          ? {}
          : {
              collectionMethod: collectionMethod as
                | 'SEND_INVOICE'
                | 'AUTO_CHARGE',
            }),
        ...(billingTiming === 'INHERIT'
          ? {}
          : {
              billingTiming: billingTiming as 'IN_ADVANCE' | 'IN_ARREARS',
            }),
        ...(prorationBehavior === 'INHERIT'
          ? {}
          : {
              prorationBehavior: prorationBehavior as
                | 'CREATE_PRORATIONS'
                | 'NONE'
                | 'ALWAYS_INVOICE',
            }),
        ...(taxBehavior === 'INHERIT'
          ? {}
          : { taxBehavior: taxBehavior as 'EXCLUSIVE' | 'INCLUSIVE' }),
        invoiceModeOverride:
          data.get('invoiceMode') === 'INHERIT'
            ? null
            : (String(data.get('invoiceMode')) as 'AUTO_FINALIZE' | 'DRAFT'),
        ...(renewalPricingPolicy === 'INHERIT'
          ? {}
          : {
              renewalPricingPolicy: renewalPricingPolicy as
                | 'RETAIN_EXISTING'
                | 'USE_LATEST'
                | 'MARKUP'
                | 'MARKDOWN',
            }),
        renewalAdjustmentPercent: String(
          data.get('renewalAdjustmentPercent') ?? ''
        )
          ? Number(data.get('renewalAdjustmentPercent'))
          : null,
        remainingCycles: String(data.get('remainingCycles') ?? '')
          ? Number(data.get('remainingCycles'))
          : null,
        ...(advanceBilling === 'INHERIT'
          ? {}
          : { advanceBillingEnabled: advanceBilling === 'ENABLED' }),
        ...(advanceBilling === 'ENABLED' &&
        String(data.get('advanceBillingDays') ?? '')
          ? { advanceBillingDays: Number(data.get('advanceBillingDays')) }
          : {}),
        promotionCode: String(data.get('promotionCode') ?? '').trim() || null,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to create subscription.')
        return
      }

      router.push(returnUrl)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div className="space-y-4">
        <SelectField
          id="billing-subscription-customer"
          label="Customer"
          value={customerId}
          options={customers}
          onChange={setCustomerId}
        />
        <div className="space-y-3">
          <Label>Plan and recurring add-ons</Label>
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]"
            >
              <NativeSelect
                value={item.priceId}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, position) =>
                      position === index
                        ? { ...entry, priceId: event.target.value }
                        : entry
                    )
                  )
                }
                className="w-full"
              >
                <NativeSelectOption value="">
                  Select recurring price…
                </NativeSelectOption>
                {prices.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, position) =>
                      position === index
                        ? { ...entry, quantity: Number(event.target.value) }
                        : entry
                    )
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                disabled={items.length === 1}
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, position) => position !== index)
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setItems((current) => [...current, { priceId: '', quantity: 1 }])
            }
          >
            Add recurring add-on
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="billing-subscription-status">Initial status</Label>
            <NativeSelect
              id="billing-subscription-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'DRAFT' | 'ACTIVE' | 'TRIALING')
              }
              className="w-full"
            >
              <NativeSelectOption value="DRAFT">Draft</NativeSelectOption>
              <NativeSelectOption value="TRIALING">Trialing</NativeSelectOption>
              <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
            </NativeSelect>
          </div>
          <NamedSelect
            name="collectionMethod"
            label="Payment mode"
            options={[
              ['INHERIT', 'Workspace default'],
              ['SEND_INVOICE', 'Send invoice'],
              ['AUTO_CHARGE', 'Auto charge'],
            ]}
          />
          <NamedSelect
            name="billingTiming"
            label="Billing timing"
            options={[
              ['INHERIT', 'Workspace default'],
              ['IN_ADVANCE', 'In advance'],
              ['IN_ARREARS', 'In arrears'],
            ]}
          />
          <NamedSelect
            name="prorationBehavior"
            label="Future changes"
            options={[
              ['INHERIT', 'Workspace default'],
              ['CREATE_PRORATIONS', 'Prorate on next invoice'],
              ['ALWAYS_INVOICE', 'Invoice proration immediately'],
              ['NONE', 'No proration'],
            ]}
          />
          <NamedSelect
            name="taxBehavior"
            label="Tax display"
            options={[
              ['INHERIT', 'Workspace default'],
              ['EXCLUSIVE', 'Tax exclusive'],
              ['INCLUSIVE', 'Tax inclusive'],
            ]}
          />
          <NamedSelect
            name="invoiceMode"
            label="Generated invoice"
            options={[
              ['INHERIT', 'Workspace default'],
              ['AUTO_FINALIZE', 'Finalize automatically'],
              ['DRAFT', 'Create draft'],
            ]}
          />
          <NamedSelect
            name="renewalPricingPolicy"
            label="Renewal price"
            options={[
              ['INHERIT', 'Workspace default'],
              ['RETAIN_EXISTING', 'Retain subscribed price'],
              ['USE_LATEST', 'Use latest catalog price'],
              ['MARKUP', 'Markup'],
              ['MARKDOWN', 'Markdown'],
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="renewalAdjustmentPercent">
              Renewal adjustment %
            </Label>
            <Input
              id="renewalAdjustmentPercent"
              name="renewalAdjustmentPercent"
              type="number"
              min="0"
              max="1000"
              step="0.0001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remainingCycles">Billing cycles</Label>
            <Input
              id="remainingCycles"
              name="remainingCycles"
              type="number"
              min="1"
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promotionCode">Promotion code</Label>
            <Input id="promotionCode" name="promotionCode" />
          </div>
          <NamedSelect
            name="advanceBilling"
            label="Advance billing"
            options={[
              ['INHERIT', 'Workspace default'],
              ['ENABLED', 'Enable for this subscription'],
              ['DISABLED', 'Disable for this subscription'],
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="advanceBillingDays">Days before renewal</Label>
            <Input
              id="advanceBillingDays"
              name="advanceBillingDays"
              type="number"
              min="1"
              max="3650"
            />
          </div>
        </div>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Subscription'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnUrl)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function NamedSelect({
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

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full"
      >
        <NativeSelectOption value="">Select…</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
