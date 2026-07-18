'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

import {
  INITIAL_TIER,
  isTieredPricingModel,
  parseMoney,
  parseTierDrafts,
  type PricingModel,
  type TierDraft,
} from './catalog-price-draft'
import { PriceTierEditor } from './price-tier-editor'

type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
type TargetType = 'item' | 'plan' | 'addon'
type CatalogTarget = {
  id: string
  label: string
  priceType?: 'ONE_TIME' | 'RECURRING'
  intervalUnit?: IntervalUnit | null
  intervalCount?: number | null
}

export function PriceCreateForm({
  currencies,
  items,
  plans,
  addons,
  returnUrl,
}: {
  currencies: CatalogTarget[]
  items: CatalogTarget[]
  plans: CatalogTarget[]
  addons: CatalogTarget[]
  returnUrl: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [targetType, setTargetType] = useState<TargetType>('item')
  const [targetId, setTargetId] = useState('')
  const [currency, setCurrency] = useState(currencies[0]?.id ?? 'JMD')
  const [amount, setAmount] = useState('')
  const [pricingModel, setPricingModel] = useState<PricingModel>('FLAT')
  const [priceType, setPriceType] = useState<'ONE_TIME' | 'RECURRING'>(
    'ONE_TIME'
  )
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('MONTH')
  const [intervalCount, setIntervalCount] = useState('1')
  const [packageSize, setPackageSize] = useState('1')
  const [unitName, setUnitName] = useState('')
  const [tiers, setTiers] = useState<TierDraft[]>([{ ...INITIAL_TIER }])

  const targets =
    targetType === 'item' ? items : targetType === 'plan' ? plans : addons
  const selectedTarget = targets.find((target) => target.id === targetId)
  const tiered = isTieredPricingModel(pricingModel)

  function handleTargetType(nextType: TargetType) {
    setTargetType(nextType)
    setTargetId('')
    setPriceType(nextType === 'plan' ? 'RECURRING' : 'ONE_TIME')
  }

  function handleTarget(nextId: string) {
    setTargetId(nextId)
    const target = targets.find((entry) => entry.id === nextId)
    if (target?.priceType) setPriceType(target.priceType)
    if (target?.intervalUnit) setIntervalUnit(target.intervalUnit)
    if (target?.intervalCount) setIntervalCount(String(target.intervalCount))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!targetId) return setError('Select a catalog target.')

    const unitAmount = parseMoney(amount)
    if (!tiered && unitAmount === null)
      return setError('Enter a valid non-negative amount.')

    const parsedTiers = tiered ? parseTierDrafts(tiers) : []
    if (!parsedTiers)
      return setError('Complete each tier with a valid range and amount.')

    startTransition(async () => {
      const result = await client.prices.create({
        [targetType === 'item'
          ? 'itemId'
          : targetType === 'plan'
            ? 'planId'
            : 'addonId']: targetId,
        currency,
        unitAmount: tiered ? null : unitAmount,
        pricingModel,
        priceType,
        unitName: unitName.trim() || null,
        packageSize: pricingModel === 'PACKAGE' ? Number(packageSize) : null,
        tiers: parsedTiers,
        ...(priceType === 'RECURRING'
          ? { intervalUnit, intervalCount: Number(intervalCount) }
          : {}),
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to create price.')
        return
      }
      router.push(returnUrl)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="876-card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price for" htmlFor="billing-price-target-type">
            <NativeSelect
              id="billing-price-target-type"
              value={targetType}
              onChange={(event) =>
                handleTargetType(event.target.value as TargetType)
              }
              className="w-full"
            >
              <NativeSelectOption value="item">Item</NativeSelectOption>
              <NativeSelectOption value="plan">Plan</NativeSelectOption>
              <NativeSelectOption value="addon">Add-on</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Catalog target" htmlFor="billing-price-target">
            <NativeSelect
              id="billing-price-target"
              value={targetId}
              onChange={(event) => handleTarget(event.target.value)}
              required
              className="w-full"
            >
              <NativeSelectOption value="">Select…</NativeSelectOption>
              {targets.map((target) => (
                <NativeSelectOption key={target.id} value={target.id}>
                  {target.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Currency" htmlFor="billing-price-currency">
            <NativeSelect
              id="billing-price-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="w-full"
            >
              {currencies.map((entry) => (
                <NativeSelectOption key={entry.id} value={entry.id}>
                  {entry.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Pricing model" htmlFor="billing-pricing-model">
            <NativeSelect
              id="billing-pricing-model"
              value={pricingModel}
              onChange={(event) =>
                setPricingModel(event.target.value as PricingModel)
              }
              className="w-full"
            >
              <NativeSelectOption value="FLAT">Flat fee</NativeSelectOption>
              <NativeSelectOption value="PER_UNIT">Per unit</NativeSelectOption>
              <NativeSelectOption value="VOLUME">Volume</NativeSelectOption>
              <NativeSelectOption value="TIERED">
                Graduated tiers
              </NativeSelectOption>
              <NativeSelectOption value="PACKAGE">Package</NativeSelectOption>
            </NativeSelect>
          </Field>
          {!tiered ? (
            <Field label="Amount" htmlFor="billing-price-amount">
              <Input
                id="billing-price-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
          ) : null}
          <Field label="Unit name" htmlFor="billing-price-unit">
            <Input
              id="billing-price-unit"
              value={unitName}
              onChange={(event) => setUnitName(event.target.value)}
              placeholder="seat, GB, project"
            />
          </Field>
          {pricingModel === 'PACKAGE' ? (
            <Field label="Units per package" htmlFor="billing-package-size">
              <Input
                id="billing-package-size"
                type="number"
                min="1"
                value={packageSize}
                onChange={(event) => setPackageSize(event.target.value)}
                required
              />
            </Field>
          ) : null}
        </div>

        {targetType === 'item' ? (
          <Field label="Charge type" htmlFor="billing-price-type">
            <NativeSelect
              id="billing-price-type"
              value={priceType}
              onChange={(event) =>
                setPriceType(event.target.value as typeof priceType)
              }
              className="w-full sm:max-w-sm"
            >
              <NativeSelectOption value="ONE_TIME">One-time</NativeSelectOption>
              <NativeSelectOption value="RECURRING">
                Recurring
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        ) : null}

        {priceType === 'RECURRING' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Interval" htmlFor="billing-price-interval-unit">
              <NativeSelect
                id="billing-price-interval-unit"
                value={intervalUnit}
                onChange={(event) =>
                  setIntervalUnit(event.target.value as IntervalUnit)
                }
                disabled={Boolean(selectedTarget?.intervalUnit)}
                className="w-full"
              >
                <NativeSelectOption value="DAY">Day</NativeSelectOption>
                <NativeSelectOption value="WEEK">Week</NativeSelectOption>
                <NativeSelectOption value="MONTH">Month</NativeSelectOption>
                <NativeSelectOption value="YEAR">Year</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Every" htmlFor="billing-price-interval-count">
              <Input
                id="billing-price-interval-count"
                type="number"
                min="1"
                value={intervalCount}
                onChange={(event) => setIntervalCount(event.target.value)}
                disabled={Boolean(selectedTarget?.intervalCount)}
              />
            </Field>
          </div>
        ) : null}
      </section>

      {tiered ? <PriceTierEditor tiers={tiers} onChange={setTiers} /> : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create price'}
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
