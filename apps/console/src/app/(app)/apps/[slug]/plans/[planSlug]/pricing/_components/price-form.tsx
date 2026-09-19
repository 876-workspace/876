'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { FormRow } from '@876/ui/form-row'
import { client } from '@/lib/client'
import { majorToMinor } from '@876/core/money'

type Initial = Record<string, unknown> | null

const TYPE_OPTIONS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
] as const

const SCHEME_OPTIONS = [
  { value: 'per_unit', label: 'Flat' },
  { value: 'tiered', label: 'Tiered' },
] as const

export function PriceForm({
  productId,
  priceId,
  initial,
}: {
  productId: string
  priceId?: string
  initial: Initial
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const value = (key: string, fallback = '') =>
    String(initial?.[key] ?? fallback)
  const [name, setName] = useState(value('name'))
  const [nickname, setNickname] = useState(value('nickname'))
  const [currency, setCurrency] = useState(value('currency', 'jmd'))
  const [type, setType] = useState(value('type', 'recurring'))
  const [scheme, setScheme] = useState(value('billing_scheme', 'per_unit'))
  const [amount, setAmount] = useState('')
  const [interval, setInterval] = useState(value('billing_interval', 'month'))
  const [count, setCount] = useState(value('interval_count', '1'))
  const [usage, setUsage] = useState('licensed')
  const [trial, setTrial] = useState(value('trial_period_days'))
  const [tax, setTax] = useState(value('tax_behavior', 'unspecified'))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          name: name || null,
          nickname: nickname || null,
          currency,
          type,
          billing_scheme: scheme,
          tax_behavior: tax,
          trial_period_days: trial ? Number(trial) : null,
        }
        if (scheme === 'per_unit')
          // The price wire contract carries unit_amount as a JSON number, and
          // majorToMinor refuses any amount that cannot survive that conversion.
          body.unit_amount = Number(majorToMinor(amount || '0', currency))
        if (type === 'recurring') {
          body.billing_interval = interval
          body.interval_count = Number(count)
          body.recurring = {
            interval,
            interval_count: Number(count),
            usage_type: usage,
            trial_period_days: trial ? Number(trial) : null,
          }
        }

        const result = priceId
          ? await client.products.updatePrice(productId, priceId, body)
          : await client.products.createPrice(productId, body)
        if (result.error) {
          setError(result.error.message)
          return
        }
        router.push('..')
        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Unable to save price.'
        )
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="876-card space-y-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="876-eyebrow">Basics</span>
          <h3 className="text-foreground text-[0.8125rem] font-medium">
            How this price is named and charged
          </h3>
        </div>

        <FormRow
          label="Name"
          hint="Shown to operators only; defaults to the amount."
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>

        <FormRow label="Nickname">
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </FormRow>

        <FormRow label="Currency" required>
          <Input
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value)}
            className="uppercase"
          />
        </FormRow>

        <FormRow label="Type" required>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as string)}
            disabled={pending}
            className="grid-flow-col justify-start gap-6 pt-1"
          >
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </FormRow>
      </section>

      <section className="876-card space-y-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="876-eyebrow">Amount</span>
          <h3 className="text-foreground text-[0.8125rem] font-medium">
            Flat rate or tiered pricing model
          </h3>
        </div>

        <FormRow label="Pricing model" required>
          <RadioGroup
            value={scheme}
            onValueChange={(value) => setScheme(value as string)}
            disabled={pending}
            className="grid-flow-col justify-start gap-6 pt-1"
          >
            {SCHEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </FormRow>

        {scheme === 'per_unit' ? (
          <FormRow label="Amount" required>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormRow>
        ) : (
          <p className="text-muted-foreground text-[0.8125rem]">
            Tier authoring is available through the API contract.
          </p>
        )}
      </section>

      {type === 'recurring' ? (
        <section className="876-card space-y-5 p-5">
          <div className="flex flex-col gap-1">
            <span className="876-eyebrow">Recurrence</span>
            <h3 className="text-foreground text-[0.8125rem] font-medium">
              Billing cadence and trial window
            </h3>
          </div>

          <div className="gap-x-4 sm:grid sm:grid-cols-2 sm:gap-y-5">
            <FormRow label="Interval" required>
              <NativeSelect
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <NativeSelectOption value="month">Month</NativeSelectOption>
                <NativeSelectOption value="year">Year</NativeSelectOption>
              </NativeSelect>
            </FormRow>
            <FormRow label="Every" required>
              <Input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </FormRow>
            <FormRow label="Usage type">
              <NativeSelect
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
              >
                <NativeSelectOption value="licensed">
                  Licensed
                </NativeSelectOption>
                <NativeSelectOption value="metered">Metered</NativeSelectOption>
              </NativeSelect>
            </FormRow>
            <FormRow label="Trial days">
              <Input
                type="number"
                min="0"
                value={trial}
                onChange={(e) => setTrial(e.target.value)}
              />
            </FormRow>
          </div>
        </section>
      ) : null}

      <section className="876-card space-y-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="876-eyebrow">Tax</span>
          <h3 className="text-foreground text-[0.8125rem] font-medium">
            How tax is applied at checkout
          </h3>
        </div>

        <FormRow
          label="Tax behavior"
          hint="Exclusive adds tax on top of the amount; inclusive takes it out of it."
        >
          <NativeSelect value={tax} onChange={(e) => setTax(e.target.value)}>
            <NativeSelectOption value="unspecified">
              Unspecified
            </NativeSelectOption>
            <NativeSelectOption value="exclusive">Exclusive</NativeSelectOption>
            <NativeSelectOption value="inclusive">Inclusive</NativeSelectOption>
          </NativeSelect>
        </FormRow>
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
