'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type Option = { id: string; label: string }
type CatalogOption = Option & {
  productId: string
  priceType?: 'ONE_TIME' | 'RECURRING'
}

export function CatalogCouponCreateForm({
  products,
  plans,
  addons,
  customers,
  currencies,
}: {
  products: Option[]
  plans: CatalogOption[]
  addons: CatalogOption[]
  customers: Option[]
  currencies: Option[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState('')
  const [currencyAmounts, setCurrencyAmounts] = useState<
    { key: string; currency: string; amount: string }[]
  >([])
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'AMOUNT'>(
    'PERCENTAGE'
  )
  const [duration, setDuration] = useState<'ONCE' | 'REPEATING' | 'FOREVER'>(
    'ONCE'
  )
  const [allPlans, setAllPlans] = useState(true)
  const [allRecurringAddons, setAllRecurringAddons] = useState(true)
  const [allOneTimeAddons, setAllOneTimeAddons] = useState(true)
  const [allCustomers, setAllCustomers] = useState(true)
  const [planIds, setPlanIds] = useState<string[]>([])
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [customerIds, setCustomerIds] = useState<string[]>([])
  const productPlans = useMemo(
    () =>
      productId ? plans.filter((plan) => plan.productId === productId) : plans,
    [plans, productId]
  )
  const productAddons = useMemo(
    () =>
      productId
        ? addons.filter((addon) => addon.productId === productId)
        : addons,
    [addons, productId]
  )

  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const amount = Math.round(Number(data.get('value')) * 100)
        const baseCurrency = String(data.get('currency') ?? '')
        const redeemByValue = String(data.get('redeemBy') ?? '')
        setError(null)
        startTransition(async () => {
          const result = await client.discounts.coupons.create({
            name: String(data.get('name') ?? ''),
            code: String(data.get('code') ?? '') || null,
            productId: productId || null,
            percentOff:
              discountType === 'PERCENTAGE' ? Number(data.get('value')) : null,
            amountOff: discountType === 'AMOUNT' ? String(amount) : null,
            currency: discountType === 'AMOUNT' ? baseCurrency : null,
            currencyAmounts:
              discountType === 'AMOUNT'
                ? currencyAmounts
                    .filter(
                      (entry) =>
                        entry.currency &&
                        entry.currency !== baseCurrency &&
                        Number(entry.amount) > 0
                    )
                    .map((entry) => ({
                      currency: entry.currency,
                      amountOff: String(Math.round(Number(entry.amount) * 100)),
                    }))
                : [],
            duration,
            durationInCycles:
              duration === 'REPEATING' ? Number(data.get('cycles')) : null,
            redeemBy: redeemByValue
              ? Math.floor(
                  new Date(`${redeemByValue}T23:59:59Z`).getTime() / 1000
                )
              : null,
            maxRedemptions: numberOrNull(data.get('maxRedemptions')),
            maxRedemptionsPerCustomer: numberOrNull(
              data.get('maxRedemptionsPerCustomer')
            ),
            discountPreference: String(data.get('discountPreference')) as
              | 'INVOICE_LEVEL'
              | 'ITEM_LEVEL',
            appliesToAllPlans: allPlans,
            appliesToAllRecurringAddons: allRecurringAddons,
            appliesToAllOneTimeAddons: allOneTimeAddons,
            eligibleForAllCustomers: allCustomers,
            planIds: allPlans ? [] : planIds,
            addonIds: allRecurringAddons && allOneTimeAddons ? [] : addonIds,
            customerIds: allCustomers ? [] : customerIds,
          })
          if (result.error || !result.data) {
            setError(result.error?.message ?? 'Failed to create coupon.')
            return
          }
          router.push(`/coupons/${result.data.id}`)
          router.refresh()
        })
      }}
    >
      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Coupon details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product" htmlFor="coupon-product">
            <NativeSelect
              id="coupon-product"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value)
                setPlanIds([])
                setAddonIds([])
              }}
              className="w-full"
            >
              <NativeSelectOption value="">All products</NativeSelectOption>
              {products.map((product) => (
                <NativeSelectOption key={product.id} value={product.id}>
                  {product.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Customer-facing code" htmlFor="coupon-code">
            <Input id="coupon-code" name="code" placeholder="WELCOME20" />
          </Field>
          <Field label="Name" htmlFor="coupon-name">
            <Input id="coupon-name" name="name" required />
          </Field>
          <Field label="Apply discount at" htmlFor="coupon-preference">
            <NativeSelect
              id="coupon-preference"
              name="discountPreference"
              className="w-full"
            >
              <NativeSelectOption value="INVOICE_LEVEL">
                Invoice level
              </NativeSelectOption>
              <NativeSelectOption value="ITEM_LEVEL">
                Eligible items only
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>
      </section>

      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Discount and redemption</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Discount type" htmlFor="coupon-discount-type">
            <NativeSelect
              id="coupon-discount-type"
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as typeof discountType)
              }
              className="w-full"
            >
              <NativeSelectOption value="PERCENTAGE">
                Percentage
              </NativeSelectOption>
              <NativeSelectOption value="AMOUNT">
                Fixed amount
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Value" htmlFor="coupon-value">
            <Input
              id="coupon-value"
              name="value"
              type="number"
              min="0.01"
              max={discountType === 'PERCENTAGE' ? '100' : undefined}
              step="0.01"
              required
            />
          </Field>
          {discountType === 'AMOUNT' ? (
            <Field label="Currency" htmlFor="coupon-currency">
              <NativeSelect
                id="coupon-currency"
                name="currency"
                className="w-full"
              >
                {currencies.map((currency) => (
                  <NativeSelectOption key={currency.id} value={currency.id}>
                    {currency.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <Field label="Redemption duration" htmlFor="coupon-duration">
            <NativeSelect
              id="coupon-duration"
              value={duration}
              onChange={(event) =>
                setDuration(event.target.value as typeof duration)
              }
              className="w-full"
            >
              <NativeSelectOption value="ONCE">
                First invoice
              </NativeSelectOption>
              <NativeSelectOption value="REPEATING">
                Limited cycles
              </NativeSelectOption>
              <NativeSelectOption value="FOREVER">
                Every renewal
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          {duration === 'REPEATING' ? (
            <Field label="Billing cycles" htmlFor="coupon-cycles">
              <Input
                id="coupon-cycles"
                name="cycles"
                type="number"
                min="1"
                required
              />
            </Field>
          ) : null}
          <Field label="Expiration date" htmlFor="coupon-redeem-by">
            <Input id="coupon-redeem-by" name="redeemBy" type="date" />
          </Field>
          <Field
            label="Total redemption limit"
            htmlFor="coupon-max-redemptions"
          >
            <Input
              id="coupon-max-redemptions"
              name="maxRedemptions"
              type="number"
              min="1"
            />
          </Field>
          <Field label="Per-customer limit" htmlFor="coupon-customer-limit">
            <Input
              id="coupon-customer-limit"
              name="maxRedemptionsPerCustomer"
              type="number"
              min="1"
            />
          </Field>
        </div>
        {discountType === 'AMOUNT' ? (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Additional currencies</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Set an exact fixed discount instead of converting money at
                  redemption time.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrencyAmounts((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      currency: '',
                      amount: '',
                    },
                  ])
                }
              >
                Add currency
              </Button>
            </div>
            {currencyAmounts.map((entry) => (
              <div
                key={entry.key}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <NativeSelect
                  aria-label="Additional coupon currency"
                  value={entry.currency}
                  onChange={(event) =>
                    setCurrencyAmounts((current) =>
                      current.map((candidate) =>
                        candidate.key === entry.key
                          ? { ...candidate, currency: event.target.value }
                          : candidate
                      )
                    )
                  }
                >
                  <NativeSelectOption value="">
                    Select currency…
                  </NativeSelectOption>
                  {currencies.map((currency) => (
                    <NativeSelectOption key={currency.id} value={currency.id}>
                      {currency.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  aria-label="Additional coupon amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={entry.amount}
                  onChange={(event) =>
                    setCurrencyAmounts((current) =>
                      current.map((candidate) =>
                        candidate.key === entry.key
                          ? { ...candidate, amount: event.target.value }
                          : candidate
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCurrencyAmounts((current) =>
                      current.filter((candidate) => candidate.key !== entry.key)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <ScopeSection
        title="Plan applicability"
        allLabel="Apply to every plan in this product"
        all={allPlans}
        setAll={setAllPlans}
        options={productPlans}
        selected={planIds}
        setSelected={setPlanIds}
      />
      <section className="876-card space-y-4 p-5">
        <h2 className="font-semibold">Add-on applicability</h2>
        <Toggle
          checked={allRecurringAddons}
          onChange={setAllRecurringAddons}
          label="All recurring add-ons"
        />
        <Toggle
          checked={allOneTimeAddons}
          onChange={setAllOneTimeAddons}
          label="All one-time add-ons"
        />
        {(!allRecurringAddons || !allOneTimeAddons) && productAddons.length ? (
          <OptionGrid
            options={productAddons}
            selected={addonIds}
            setSelected={setAddonIds}
          />
        ) : null}
      </section>
      <ScopeSection
        title="Customer eligibility"
        allLabel="All customers can redeem this coupon"
        all={allCustomers}
        setAll={setAllCustomers}
        options={customers}
        selected={customerIds}
        setSelected={setCustomerIds}
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create coupon'}
      </Button>
    </form>
  )
}

function ScopeSection({
  title,
  allLabel,
  all,
  setAll,
  options,
  selected,
  setSelected,
}: {
  title: string
  allLabel: string
  all: boolean
  setAll: (value: boolean) => void
  options: Option[]
  selected: string[]
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
}) {
  return (
    <section className="876-card space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      <Toggle checked={all} onChange={setAll} label={allLabel} />
      {!all ? (
        <OptionGrid
          options={options}
          selected={selected}
          setSelected={setSelected}
        />
      ) : null}
    </section>
  )
}

function OptionGrid({
  options,
  selected,
  setSelected,
}: {
  options: Option[]
  selected: string[]
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-3 rounded-lg border p-3 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, option.id]
                  : current.filter((id) => id !== option.id)
              )
            }
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? Number(text) : null
}
