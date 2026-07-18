'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { parseMinorAmountInput } from '@/lib/format'

type Option = { value: string; label: string }

export function PaymentTermCreateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rule, setRule] = useState<
    'DUE_ON_RECEIPT' | 'NET_DAYS' | 'END_OF_MONTH' | 'END_OF_NEXT_MONTH'
  >('NET_DAYS')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="876-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        setError(null)
        startTransition(async () => {
          const result = await client.paymentTerms.create({
            name: String(data.get('name') ?? ''),
            rule,
            dueDays: rule === 'NET_DAYS' ? Number(data.get('dueDays')) : 0,
            isDefault: data.get('isDefault') === 'on',
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          form.reset()
          router.refresh()
        })
      }}
    >
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="payment-term-name">Name</Label>
        <Input
          id="payment-term-name"
          name="name"
          placeholder="Net 30"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment-term-rule">Rule</Label>
        <NativeSelect
          id="payment-term-rule"
          value={rule}
          onChange={(event) => setRule(event.target.value as typeof rule)}
          className="w-full"
        >
          <NativeSelectOption value="DUE_ON_RECEIPT">
            Due on receipt
          </NativeSelectOption>
          <NativeSelectOption value="NET_DAYS">Net days</NativeSelectOption>
          <NativeSelectOption value="END_OF_MONTH">
            End of month
          </NativeSelectOption>
          <NativeSelectOption value="END_OF_NEXT_MONTH">
            End of next month
          </NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment-term-days">Days</Label>
        <Input
          id="payment-term-days"
          name="dueDays"
          type="number"
          min="0"
          max="3650"
          defaultValue="30"
          disabled={rule !== 'NET_DAYS'}
          required={rule === 'NET_DAYS'}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Adding…' : 'Add term'}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-5">
        <input name="isDefault" type="checkbox" className="size-4" />
        Use as the workspace default for new invoices
      </label>
      <FormError error={error} className="sm:col-span-2 lg:col-span-5" />
    </form>
  )
}

export function SalespersonCreateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="876-card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const email = String(data.get('email') ?? '').trim()
        setError(null)
        startTransition(async () => {
          const result = await client.salespeople.create({
            name: String(data.get('name') ?? ''),
            email: email || null,
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          form.reset()
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="salesperson-name">Name</Label>
        <Input id="salesperson-name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salesperson-email">Email (optional)</Label>
        <Input id="salesperson-email" name="email" type="email" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add salesperson'}
      </Button>
      <FormError error={error} className="sm:col-span-3" />
    </form>
  )
}

export function CouponCreateForm({ currencies }: { currencies: Option[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(
    'percentage'
  )
  const [duration, setDuration] = useState<'ONCE' | 'REPEATING' | 'FOREVER'>(
    'ONCE'
  )
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="876-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const amount = parseMinorAmountInput(
          String(data.get('amount') ?? ''),
          2
        )
        if (discountType === 'amount' && amount === null) {
          setError('Enter a valid discount amount.')
          return
        }
        setError(null)
        startTransition(async () => {
          const result = await client.discounts.coupons.create({
            name: String(data.get('name') ?? ''),
            percentOff:
              discountType === 'percentage'
                ? Number(data.get('percentOff'))
                : null,
            amountOff: discountType === 'amount' ? amount : null,
            currency:
              discountType === 'amount'
                ? String(data.get('currency') ?? '')
                : null,
            duration,
            durationInCycles:
              duration === 'REPEATING' ? Number(data.get('cycles')) : null,
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          form.reset()
          router.refresh()
        })
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="coupon-name">Coupon name</Label>
        <Input
          id="coupon-name"
          name="name"
          placeholder="Launch offer"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coupon-type">Discount type</Label>
        <NativeSelect
          id="coupon-type"
          value={discountType}
          onChange={(event) =>
            setDiscountType(event.target.value as typeof discountType)
          }
          className="w-full"
        >
          <NativeSelectOption value="percentage">Percentage</NativeSelectOption>
          <NativeSelectOption value="amount">Fixed amount</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coupon-value">Value</Label>
        <Input
          id="coupon-value"
          name={discountType === 'percentage' ? 'percentOff' : 'amount'}
          type="number"
          min="0.01"
          max={discountType === 'percentage' ? '100' : undefined}
          step="0.01"
          placeholder={discountType === 'percentage' ? '15' : '1000.00'}
          required
        />
      </div>
      {discountType === 'amount' ? (
        <div className="space-y-2">
          <Label htmlFor="coupon-currency">Currency</Label>
          <NativeSelect
            id="coupon-currency"
            name="currency"
            className="w-full"
            required
          >
            {currencies.map((currency) => (
              <NativeSelectOption key={currency.value} value={currency.value}>
                {currency.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="coupon-duration">Duration</Label>
        <NativeSelect
          id="coupon-duration"
          value={duration}
          onChange={(event) =>
            setDuration(event.target.value as typeof duration)
          }
          className="w-full"
        >
          <NativeSelectOption value="ONCE">Once</NativeSelectOption>
          <NativeSelectOption value="REPEATING">Repeating</NativeSelectOption>
          <NativeSelectOption value="FOREVER">Forever</NativeSelectOption>
        </NativeSelect>
      </div>
      {duration === 'REPEATING' ? (
        <div className="space-y-2">
          <Label htmlFor="coupon-cycles">Billing cycles</Label>
          <Input
            id="coupon-cycles"
            name="cycles"
            type="number"
            min="1"
            required
          />
        </div>
      ) : null}
      <div className="flex items-end lg:col-start-4">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Creating…' : 'Create coupon'}
        </Button>
      </div>
      <FormError error={error} className="sm:col-span-2 lg:col-span-4" />
    </form>
  )
}

export function PromotionCodeCreateForm({ coupons }: { coupons: Option[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="876-card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        setError(null)
        startTransition(async () => {
          const result = await client.discounts.promotionCodes.create({
            couponId: String(data.get('couponId') ?? ''),
            code: String(data.get('code') ?? ''),
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          form.reset()
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="promotion-coupon">Coupon</Label>
        <NativeSelect
          id="promotion-coupon"
          name="couponId"
          className="w-full"
          required
        >
          <NativeSelectOption value="">Select coupon…</NativeSelectOption>
          {coupons.map((coupon) => (
            <NativeSelectOption key={coupon.value} value={coupon.value}>
              {coupon.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="promotion-code">Customer-facing code</Label>
        <Input
          id="promotion-code"
          name="code"
          placeholder="WELCOME15"
          required
        />
      </div>
      <Button type="submit" disabled={isPending || coupons.length === 0}>
        {isPending ? 'Creating…' : 'Create code'}
      </Button>
      <FormError error={error} className="sm:col-span-3" />
    </form>
  )
}

export function ProviderConnectionCreateForm({
  providers,
}: {
  providers: Option[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="876-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const merchantAccountId = String(
          data.get('merchantAccountId') ?? ''
        ).trim()
        const credentialsReference = String(
          data.get('credentialsReference') ?? ''
        ).trim()
        setError(null)
        startTransition(async () => {
          const result = await client.paymentProviders.connections.create({
            providerId: String(data.get('providerId') ?? ''),
            name: String(data.get('name') ?? ''),
            environment: String(data.get('environment')) as 'SANDBOX' | 'LIVE',
            merchantAccountId: merchantAccountId || null,
            credentialsReference: credentialsReference || null,
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          form.reset()
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="provider-id">Provider</Label>
        <NativeSelect
          id="provider-id"
          name="providerId"
          className="w-full"
          required
        >
          <NativeSelectOption value="">Select provider…</NativeSelectOption>
          {providers.map((provider) => (
            <NativeSelectOption key={provider.value} value={provider.value}>
              {provider.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider-name">Connection name</Label>
        <Input
          id="provider-name"
          name="name"
          placeholder="Amber Pay Jamaica"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider-environment">Environment</Label>
        <NativeSelect
          id="provider-environment"
          name="environment"
          className="w-full"
        >
          <NativeSelectOption value="SANDBOX">Sandbox</NativeSelectOption>
          <NativeSelectOption value="LIVE">Live</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider-merchant">Merchant account ID</Label>
        <Input id="provider-merchant" name="merchantAccountId" />
      </div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="provider-credentials">Credential reference</Label>
        <Input
          id="provider-credentials"
          name="credentialsReference"
          placeholder="secret://billing/amber-pay/production"
        />
        <p className="text-muted-foreground text-xs">
          Store only a secret-manager reference here, never an API key or
          password.
        </p>
      </div>
      <div className="flex items-end">
        <Button
          type="submit"
          disabled={isPending || providers.length === 0}
          className="w-full"
        >
          {isPending ? 'Connecting…' : 'Add connection'}
        </Button>
      </div>
      <FormError error={error} className="sm:col-span-2 lg:col-span-4" />
    </form>
  )
}

function FormError({
  error,
  className,
}: {
  error: string | null
  className?: string
}) {
  if (!error) return null
  return (
    <p role="alert" className={`text-destructive text-sm ${className ?? ''}`}>
      {error}
    </p>
  )
}
