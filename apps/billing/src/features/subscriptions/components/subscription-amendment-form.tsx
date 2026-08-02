'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

type Option = { value: string; label: string }
type Item = { priceId: string; quantity: number }

export function SubscriptionAmendmentForm({
  subscriptionId,
  prices,
  initialItems,
  initial,
}: {
  subscriptionId: string
  prices: Option[]
  initialItems: Item[]
  initial: {
    collectionMethod: 'SEND_INVOICE' | 'AUTO_CHARGE'
    billingTiming: 'IN_ADVANCE' | 'IN_ARREARS'
    taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
    invoiceModeOverride: 'AUTO_FINALIZE' | 'DRAFT' | null
    renewalPricingPolicy:
      | 'RETAIN_EXISTING'
      | 'USE_LATEST'
      | 'MARKUP'
      | 'MARKDOWN'
    renewalAdjustmentPercent: string | null
    billingCycleAnchor: number | null
    remainingCycles: number | null
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)
  const [changeTiming, setChangeTiming] = useState('IMMEDIATE')
  const [renewalPolicy, setRenewalPolicy] = useState(
    initial.renewalPricingPolicy
  )
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="876-card space-y-6 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        if (
          items.length === 0 ||
          items.some((item) => !item.priceId || item.quantity < 1)
        ) {
          setMessage('Select at least one recurring price and valid quantity.')
          return
        }
        setMessage(null)
        startTransition(async () => {
          const timing = String(data.get('timing')) as
            | 'IMMEDIATE'
            | 'END_OF_TERM'
            | 'SCHEDULED'
          const effectiveText = String(data.get('effectiveAt') ?? '')
          const renewal = String(
            data.get('renewalPricingPolicy')
          ) as typeof initial.renewalPricingPolicy
          const adjustmentText = String(
            data.get('renewalAdjustmentPercent') ?? ''
          )
          const cyclesText = String(data.get('remainingCycles') ?? '')
          const anchorText = String(data.get('billingCycleAnchor') ?? '')
          const result = await client.subscriptions.createAmendment(
            subscriptionId,
            {
              timing,
              effectiveAt: effectiveText
                ? Math.floor(new Date(effectiveText).getTime() / 1000)
                : null,
              prorationBehavior: String(data.get('prorationBehavior')) as
                | 'CREATE_PRORATIONS'
                | 'NONE'
                | 'ALWAYS_INVOICE',
              paymentFailureBehavior: String(
                data.get('paymentFailureBehavior')
              ) as 'PREVENT_CHANGE' | 'APPLY_CHANGE',
              items,
              collectionMethod: String(data.get('collectionMethod')) as
                | 'SEND_INVOICE'
                | 'AUTO_CHARGE',
              billingTiming: String(data.get('billingTiming')) as
                | 'IN_ADVANCE'
                | 'IN_ARREARS',
              taxBehavior: String(data.get('taxBehavior')) as
                | 'EXCLUSIVE'
                | 'INCLUSIVE',
              invoiceModeOverride:
                String(data.get('invoiceModeOverride')) === 'INHERIT'
                  ? null
                  : (String(data.get('invoiceModeOverride')) as
                      | 'AUTO_FINALIZE'
                      | 'DRAFT'),
              renewalPricingPolicy: renewal,
              renewalAdjustmentPercent: adjustmentText
                ? Number(adjustmentText)
                : null,
              billingCycleAnchor: anchorText
                ? Math.floor(
                    new Date(`${anchorText}T00:00:00.000Z`).getTime() / 1000
                  )
                : null,
              remainingCycles: cyclesText ? Number(cyclesText) : null,
              reason: String(data.get('reason') ?? '').trim() || null,
            }
          )
          if (result.error) {
            setMessage(result.error.message)
            return
          }
          router.push(`/subscriptions/${subscriptionId}`)
          router.refresh()
        })
      }}
    >
      <div>
        <h1 className="876-page-title">Change subscription</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The current item snapshots remain in history. Immediate changes create
          prorated charges or credit notes; scheduled changes replace any
          earlier pending amendment.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Items after the change</h2>
        {items.map((item, index) => (
          <div
            key={`${index}-${item.priceId}`}
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
              {prices.map((price) => (
                <NativeSelectOption key={price.value} value={price.value}>
                  {price.label}
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
          Add item
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          name="timing"
          label="Effective"
          initial="IMMEDIATE"
          value={changeTiming}
          onChange={setChangeTiming}
          options={[
            ['IMMEDIATE', 'Immediately'],
            ['END_OF_TERM', 'End of current term'],
            ['SCHEDULED', 'Scheduled date'],
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="effectiveAt">Scheduled date</Label>
          <Input
            id="effectiveAt"
            name="effectiveAt"
            type="datetime-local"
            disabled={changeTiming !== 'SCHEDULED'}
            required={changeTiming === 'SCHEDULED'}
          />
        </div>
        <Select
          name="prorationBehavior"
          label="Proration"
          initial="CREATE_PRORATIONS"
          options={[
            ['CREATE_PRORATIONS', 'Add adjustment to next invoice'],
            ['ALWAYS_INVOICE', 'Invoice adjustment immediately'],
            ['NONE', 'No proration'],
          ]}
        />
        <Select
          name="paymentFailureBehavior"
          label="If payment fails"
          initial="PREVENT_CHANGE"
          options={[
            ['PREVENT_CHANGE', 'Keep pending terms'],
            ['APPLY_CHANGE', 'Apply terms and leave invoice open'],
          ]}
        />
        <Select
          name="collectionMethod"
          label="Payment mode"
          initial={initial.collectionMethod}
          options={[
            ['SEND_INVOICE', 'Send invoice'],
            ['AUTO_CHARGE', 'Auto charge'],
          ]}
        />
        <Select
          name="billingTiming"
          label="Billing timing"
          initial={initial.billingTiming}
          options={[
            ['IN_ADVANCE', 'In advance'],
            ['IN_ARREARS', 'In arrears'],
          ]}
        />
        <Select
          name="taxBehavior"
          label="Tax display"
          initial={initial.taxBehavior}
          options={[
            ['EXCLUSIVE', 'Tax exclusive'],
            ['INCLUSIVE', 'Tax inclusive'],
          ]}
        />
        <Select
          name="invoiceModeOverride"
          label="Generated invoice"
          initial={initial.invoiceModeOverride ?? 'INHERIT'}
          options={[
            ['INHERIT', 'Workspace default'],
            ['AUTO_FINALIZE', 'Finalize automatically'],
            ['DRAFT', 'Create draft'],
          ]}
        />
        <Select
          name="renewalPricingPolicy"
          label="Renewal pricing"
          initial={initial.renewalPricingPolicy}
          value={renewalPolicy}
          onChange={(value) => setRenewalPolicy(value as typeof renewalPolicy)}
          options={[
            ['RETAIN_EXISTING', 'Retain subscribed price'],
            ['USE_LATEST', 'Use latest catalog price'],
            ['MARKUP', 'Markup'],
            ['MARKDOWN', 'Markdown'],
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="renewalAdjustmentPercent">Renewal adjustment %</Label>
          <Input
            id="renewalAdjustmentPercent"
            name="renewalAdjustmentPercent"
            type="number"
            min="0"
            max="1000"
            step="0.0001"
            defaultValue={initial.renewalAdjustmentPercent ?? ''}
            disabled={
              renewalPolicy !== 'MARKUP' && renewalPolicy !== 'MARKDOWN'
            }
            required={
              renewalPolicy === 'MARKUP' || renewalPolicy === 'MARKDOWN'
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingCycleAnchor">
            Billing cycle anchor (UTC date)
          </Label>
          <Input
            id="billingCycleAnchor"
            name="billingCycleAnchor"
            type="date"
            defaultValue={utcDate(initial.billingCycleAnchor)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remainingCycles">Remaining cycles</Label>
          <Input
            id="remainingCycles"
            name="remainingCycles"
            type="number"
            min="1"
            defaultValue={initial.remainingCycles ?? ''}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="reason">Internal reason</Label>
          <Textarea id="reason" name="reason" rows={3} />
        </div>
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
          {isPending ? 'Saving…' : 'Save change'}
        </Button>
      </div>
    </form>
  )
}

function utcDate(timestamp: number | null) {
  if (timestamp === null) return ''

  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function Select({
  name,
  label,
  initial,
  options,
  value,
  onChange,
}: {
  name: string
  label: string
  initial: string
  options: Array<[string, string]>
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect
        id={name}
        name={name}
        {...(value === undefined ? { defaultValue: initial } : { value })}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className="w-full"
      >
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
