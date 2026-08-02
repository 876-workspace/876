'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type Option = { id: string; label: string }

export function PriceListCreateForm({
  currencies,
  prices,
}: {
  currencies: Option[]
  prices: Option[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'PERCENTAGE' | 'CUSTOM'>('PERCENTAGE')
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Record<string, string>>({})

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const customEntries = Object.entries(entries).flatMap(
          ([priceId, amount]) => {
            const number = Number(amount)
            return Number.isFinite(number) && number >= 0
              ? [{ priceId, unitAmount: String(Math.round(number * 100)) }]
              : []
          }
        )
        if (mode === 'CUSTOM' && customEntries.length === 0) {
          setError('Select at least one price and enter its custom amount.')
          return
        }
        setError(null)
        startTransition(async () => {
          const result = await client.priceLists.create({
            name: String(data.get('name') ?? ''),
            description: String(data.get('description') ?? '').trim() || null,
            mode,
            direction:
              mode === 'PERCENTAGE'
                ? (String(data.get('direction')) as 'MARKUP' | 'MARKDOWN')
                : null,
            percentage:
              mode === 'PERCENTAGE' ? Number(data.get('percentage')) : null,
            currency: mode === 'CUSTOM' ? String(data.get('currency')) : null,
            rounding: String(data.get('rounding')) as
              | 'NONE'
              | 'NEAREST'
              | 'UP'
              | 'DOWN',
            roundingPrecision: Number(data.get('roundingPrecision')),
            entries: customEntries,
          })
          if (result.error || !result.data) {
            setError(result.error?.message ?? 'Failed to create price list.')
            return
          }
          router.push(`/price-lists/${result.data.id}`)
          router.refresh()
        })
      }}
    >
      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Price-list details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="price-list-name">
            <Input id="price-list-name" name="name" required />
          </Field>
          <Field label="Pricing method" htmlFor="price-list-mode">
            <NativeSelect
              id="price-list-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="w-full"
            >
              <NativeSelectOption value="PERCENTAGE">
                Percentage adjustment
              </NativeSelectOption>
              <NativeSelectOption value="CUSTOM">
                Individual prices
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Internal description"
              htmlFor="price-list-description"
            >
              <Input id="price-list-description" name="description" />
            </Field>
          </div>
        </div>
      </section>

      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Price rules</h2>
        {mode === 'PERCENTAGE' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Direction" htmlFor="price-list-direction">
              <NativeSelect
                id="price-list-direction"
                name="direction"
                className="w-full"
              >
                <NativeSelectOption value="MARKDOWN">
                  Markdown
                </NativeSelectOption>
                <NativeSelectOption value="MARKUP">Markup</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Percentage" htmlFor="price-list-percentage">
              <Input
                id="price-list-percentage"
                name="percentage"
                type="number"
                min="0.0001"
                max="1000"
                step="0.0001"
                required
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Currency" htmlFor="price-list-currency">
              <NativeSelect
                id="price-list-currency"
                name="currency"
                className="w-full sm:max-w-sm"
              >
                {currencies.map((currency) => (
                  <NativeSelectOption key={currency.id} value={currency.id}>
                    {currency.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="divide-y rounded-lg border">
              {prices.map((price) => {
                const selected = price.id in entries
                return (
                  <div
                    key={price.id}
                    className="grid gap-3 p-4 sm:grid-cols-[1fr_12rem] sm:items-center"
                  >
                    <label className="flex items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          setEntries((current) => {
                            if (event.target.checked)
                              return { ...current, [price.id]: '' }
                            const next = { ...current }
                            delete next[price.id]
                            return next
                          })
                        }
                      />
                      {price.label}
                    </label>
                    <Input
                      aria-label={`${price.label} custom amount`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Custom amount"
                      disabled={!selected}
                      value={entries[price.id] ?? ''}
                      onChange={(event) =>
                        setEntries((current) => ({
                          ...current,
                          [price.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rounding" htmlFor="price-list-rounding">
            <NativeSelect
              id="price-list-rounding"
              name="rounding"
              className="w-full"
            >
              <NativeSelectOption value="NONE">No rounding</NativeSelectOption>
              <NativeSelectOption value="NEAREST">Nearest</NativeSelectOption>
              <NativeSelectOption value="UP">Always up</NativeSelectOption>
              <NativeSelectOption value="DOWN">Always down</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Decimal places" htmlFor="price-list-precision">
            <Input
              id="price-list-precision"
              name="roundingPrecision"
              type="number"
              min="0"
              max="6"
              defaultValue="2"
            />
          </Field>
        </div>
      </section>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create price list'}
      </Button>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
