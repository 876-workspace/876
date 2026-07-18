'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

export function CouponEditForm({
  coupon,
}: {
  coupon: {
    id: string
    name: string
    redeemBy: number | null
    maxRedemptions: number | null
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const redeemBy = String(data.get('redeemBy') ?? '')
        const maxRedemptions = String(data.get('maxRedemptions') ?? '')
        setError(null)
        startTransition(async () => {
          const result = await client.discounts.coupons.update(coupon.id, {
            name: String(data.get('name') ?? ''),
            redeemBy: redeemBy
              ? Math.floor(new Date(`${redeemBy}T23:59:59Z`).getTime() / 1000)
              : null,
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          router.push(`/coupons/${coupon.id}`)
          router.refresh()
        })
      }}
    >
      <section className="876-card space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="coupon-edit-name">Name</Label>
          <Input
            id="coupon-edit-name"
            name="name"
            defaultValue={coupon.name}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coupon-edit-expiry">Expiration date</Label>
            <Input
              id="coupon-edit-expiry"
              name="redeemBy"
              type="date"
              defaultValue={
                coupon.redeemBy
                  ? new Date(coupon.redeemBy * 1000).toISOString().slice(0, 10)
                  : ''
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-edit-limit">Total redemption limit</Label>
            <Input
              id="coupon-edit-limit"
              name="maxRedemptions"
              type="number"
              min="1"
              defaultValue={coupon.maxRedemptions ?? ''}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Discount value, duration, and applicability remain immutable after
          creation so prior subscription decisions stay auditable.
        </p>
      </section>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save coupon'}
      </Button>
    </form>
  )
}
