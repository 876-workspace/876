'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { client } from '@/lib/client'
import { majorToMinor } from '@/lib/money'

type Initial = Record<string, unknown> | null
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
          body.unit_amount = majorToMinor(amount || '0', currency)
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
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Basics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Nickname">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </Field>
          <Field label="Currency" required>
            <Input
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </Field>
          <fieldset>
            <Label>
              Type <span aria-hidden="true">*</span>
            </Label>
            <div className="mt-2 flex gap-4">
              <label>
                <input
                  type="radio"
                  checked={type === 'one_time'}
                  onChange={() => setType('one_time')}
                />{' '}
                One-time
              </label>
              <label>
                <input
                  type="radio"
                  checked={type === 'recurring'}
                  onChange={() => setType('recurring')}
                />{' '}
                Recurring
              </label>
            </div>
          </fieldset>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Amount</h2>
        <fieldset>
          <Label>
            Pricing model <span aria-hidden="true">*</span>
          </Label>
          <div className="mt-2 flex gap-4">
            <label>
              <input
                type="radio"
                checked={scheme === 'per_unit'}
                onChange={() => setScheme('per_unit')}
              />{' '}
              Flat
            </label>
            <label>
              <input
                type="radio"
                checked={scheme === 'tiered'}
                onChange={() => setScheme('tiered')}
              />{' '}
              Tiered
            </label>
          </div>
        </fieldset>
        {scheme === 'per_unit' ? (
          <Field label="Amount" required>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        ) : (
          <p className="text-muted-foreground text-sm">
            Tier authoring is available through the API contract.
          </p>
        )}
      </section>
      {type === 'recurring' ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Recurring</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Interval" required>
              <NativeSelect
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <NativeSelectOption value="month">Month</NativeSelectOption>
                <NativeSelectOption value="year">Year</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Interval count" required>
              <Input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
            <Field label="Usage type">
              <NativeSelect
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
              >
                <NativeSelectOption value="licensed">
                  Licensed
                </NativeSelectOption>
                <NativeSelectOption value="metered">Metered</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Trial period days">
              <Input
                type="number"
                min="0"
                value={trial}
                onChange={(e) => setTrial(e.target.value)}
              />
            </Field>
          </div>
        </section>
      ) : null}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Tax</h2>
        <Field label="Tax behavior">
          <NativeSelect value={tax} onChange={(e) => setTax(e.target.value)}>
            <NativeSelectOption value="unspecified">
              Unspecified
            </NativeSelectOption>
            <NativeSelectOption value="exclusive">Exclusive</NativeSelectOption>
            <NativeSelectOption value="inclusive">Inclusive</NativeSelectOption>
          </NativeSelect>
        </Field>
      </section>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save price'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}
