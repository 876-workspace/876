'use client'

import { useMemo, useState, useTransition } from 'react'
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

type ProductOption = { id: string; label: string }
type PlanOption = ProductOption & {
  productId: string
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  intervalCount: number
}

export function AddonCreateForm({
  products,
  plans,
  currencies,
}: {
  products: ProductOption[]
  plans: PlanOption[]
  currencies: ProductOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [priceType, setPriceType] = useState<'ONE_TIME' | 'RECURRING'>(
    'RECURRING'
  )
  const [intervalUnit, setIntervalUnit] = useState<
    'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  >('MONTH')
  const [intervalCount, setIntervalCount] = useState('1')
  const [pricingModel, setPricingModel] = useState<PricingModel>('FLAT')
  const [tiers, setTiers] = useState<TierDraft[]>([{ ...INITIAL_TIER }])
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({})
  const matchingPlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.productId === productId &&
          (priceType === 'ONE_TIME' ||
            (plan.intervalUnit === intervalUnit &&
              plan.intervalCount === Number(intervalCount)))
      ),
    [plans, productId, priceType, intervalUnit, intervalCount]
  )

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const tiered = isTieredPricingModel(pricingModel)
        const amount = parseMoney(String(data.get('amount') ?? ''))
        const parsedTiers = tiered ? parseTierDrafts(tiers) : []
        if (!tiered && amount === null) {
          setError('Enter a valid non-negative price.')
          return
        }
        if (!parsedTiers) {
          setError('Complete each tier with a valid range and amount.')
          return
        }
        setError(null)
        startTransition(async () => {
          const result = await client.addons.create({
            productId,
            code: String(data.get('code') ?? ''),
            name: String(data.get('name') ?? ''),
            description: String(data.get('description') ?? '').trim() || null,
            type: String(data.get('type')) as 'GOOD' | 'SERVICE',
            priceType,
            intervalUnit: priceType === 'RECURRING' ? intervalUnit : null,
            intervalCount:
              priceType === 'RECURRING' ? Number(intervalCount) : null,
            unitName: String(data.get('unitName') ?? '').trim() || null,
            taxCode: String(data.get('taxCode') ?? '').trim() || null,
            isTaxable: data.get('isTaxable') === 'on',
            showInCheckout: data.get('showInCheckout') === 'on',
            allowPortalManagement: data.get('allowPortalManagement') === 'on',
            price: {
              currency: String(data.get('currency') ?? 'JMD'),
              unitAmount: tiered ? null : amount,
              pricingModel,
              packageSize:
                pricingModel === 'PACKAGE'
                  ? Number(data.get('packageSize'))
                  : null,
              unitName: String(data.get('unitName') ?? '').trim() || null,
              tiers: parsedTiers,
            },
            associations: Object.entries(selectedPlans).map(
              ([planId, associationType]) => ({
                planId,
                associationType: associationType as
                  | 'OPTIONAL'
                  | 'RECOMMENDED'
                  | 'MANDATORY',
                events: ['SUBSCRIPTION_ACTIVATION' as const],
                frequency: 'EVERY_OCCURRENCE' as const,
              })
            ),
          })
          if (result.error || !result.data) {
            setError(result.error?.message ?? 'Failed to create add-on.')
            return
          }
          router.push(`/addons/${result.data.id}`)
          router.refresh()
        })
      }}
    >
      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Add-on details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product" htmlFor="addon-product">
            <NativeSelect
              id="addon-product"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value)
                setSelectedPlans({})
              }}
              className="w-full"
              required
            >
              {products.map((product) => (
                <NativeSelectOption key={product.id} value={product.id}>
                  {product.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Code" htmlFor="addon-code">
            <Input id="addon-code" name="code" required />
          </FormField>
          <FormField label="Name" htmlFor="addon-name">
            <Input id="addon-name" name="name" required />
          </FormField>
          <FormField label="Type" htmlFor="addon-type">
            <NativeSelect id="addon-type" name="type" className="w-full">
              <NativeSelectOption value="SERVICE">Service</NativeSelectOption>
              <NativeSelectOption value="GOOD">Good</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="addon-description">
              <Input id="addon-description" name="description" />
            </FormField>
          </div>
          <FormField label="Unit" htmlFor="addon-unit">
            <Input id="addon-unit" name="unitName" placeholder="seat, GB" />
          </FormField>
          <FormField label="Tax code" htmlFor="addon-tax-code">
            <Input id="addon-tax-code" name="taxCode" />
          </FormField>
        </div>
        <Checkbox name="isTaxable" label="Taxable" />
        <Checkbox
          name="showInCheckout"
          label="Show on pricing and checkout surfaces"
          defaultChecked
        />
        <Checkbox
          name="allowPortalManagement"
          label="Allow customers to manage this add-on in the portal"
        />
      </section>

      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Billing and price</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Charge type" htmlFor="addon-charge-type">
            <NativeSelect
              id="addon-charge-type"
              value={priceType}
              onChange={(event) => {
                setPriceType(event.target.value as typeof priceType)
                setSelectedPlans({})
              }}
              className="w-full"
            >
              <NativeSelectOption value="RECURRING">
                Recurring
              </NativeSelectOption>
              <NativeSelectOption value="ONE_TIME">One-time</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField label="Pricing model" htmlFor="addon-pricing-model">
            <NativeSelect
              id="addon-pricing-model"
              value={pricingModel}
              onChange={(event) =>
                setPricingModel(event.target.value as typeof pricingModel)
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
          </FormField>
          {priceType === 'RECURRING' ? (
            <>
              <FormField label="Interval" htmlFor="addon-interval-unit">
                <NativeSelect
                  id="addon-interval-unit"
                  value={intervalUnit}
                  onChange={(event) => {
                    setIntervalUnit(event.target.value as typeof intervalUnit)
                    setSelectedPlans({})
                  }}
                  className="w-full"
                >
                  <NativeSelectOption value="DAY">Day</NativeSelectOption>
                  <NativeSelectOption value="WEEK">Week</NativeSelectOption>
                  <NativeSelectOption value="MONTH">Month</NativeSelectOption>
                  <NativeSelectOption value="YEAR">Year</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Every" htmlFor="addon-interval-count">
                <Input
                  id="addon-interval-count"
                  type="number"
                  min="1"
                  value={intervalCount}
                  onChange={(event) => {
                    setIntervalCount(event.target.value)
                    setSelectedPlans({})
                  }}
                />
              </FormField>
            </>
          ) : null}
          <FormField label="Currency" htmlFor="addon-currency">
            <NativeSelect
              id="addon-currency"
              name="currency"
              className="w-full"
            >
              {currencies.map((currency) => (
                <NativeSelectOption key={currency.id} value={currency.id}>
                  {currency.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          {!isTieredPricingModel(pricingModel) ? (
            <FormField label="Amount" htmlFor="addon-amount">
              <Input
                id="addon-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </FormField>
          ) : null}
          {pricingModel === 'PACKAGE' ? (
            <FormField label="Package size" htmlFor="addon-package-size">
              <Input
                id="addon-package-size"
                name="packageSize"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
            </FormField>
          ) : null}
        </div>
      </section>

      {isTieredPricingModel(pricingModel) ? (
        <PriceTierEditor tiers={tiers} onChange={setTiers} />
      ) : null}

      <section className="876-card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Plan availability</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Recurring add-ons are shown only for plans with the same cadence.
          </p>
        </div>
        {matchingPlans.length ? (
          matchingPlans.map((plan) => (
            <div
              key={plan.id}
              className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_13rem] sm:items-center"
            >
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={plan.id in selectedPlans}
                  onChange={(event) =>
                    setSelectedPlans((current) => {
                      if (!event.target.checked) {
                        const next = { ...current }
                        delete next[plan.id]
                        return next
                      }
                      return { ...current, [plan.id]: 'OPTIONAL' }
                    })
                  }
                />
                {plan.label}
              </label>
              <NativeSelect
                aria-label={`${plan.label} association type`}
                value={selectedPlans[plan.id] ?? 'OPTIONAL'}
                disabled={!(plan.id in selectedPlans)}
                onChange={(event) =>
                  setSelectedPlans((current) => ({
                    ...current,
                    [plan.id]: event.target.value,
                  }))
                }
                className="w-full"
              >
                <NativeSelectOption value="OPTIONAL">
                  Optional
                </NativeSelectOption>
                <NativeSelectOption value="RECOMMENDED">
                  Recommended
                </NativeSelectOption>
                <NativeSelectOption value="MANDATORY">
                  Mandatory
                </NativeSelectOption>
              </NativeSelect>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">
            No plans match this product and cadence.
          </p>
        )}
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={isPending || !productId}>
        {isPending ? 'Creating…' : 'Create add-on'}
      </Button>
    </form>
  )
}

function FormField({
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

function Checkbox({
  name,
  label,
  defaultChecked = false,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  )
}
