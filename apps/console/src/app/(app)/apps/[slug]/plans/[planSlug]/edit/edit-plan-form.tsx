'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProduct } from '@876/admin'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { toast } from 'sonner'

import { client } from '@/lib/client'

type Props = { product: AdminProduct; appSlug: string }

function formatPrice(
  unitAmount: number,
  currency: string,
  interval: string | null
): string {
  if (unitAmount === 0) return 'Free'
  const amount = (unitAmount / 100).toFixed(2)
  return `$${amount} ${currency.toUpperCase()}${interval ? `/${interval}` : ''}`
}

export function EditPlanForm({ product, appSlug }: Props) {
  const router = useRouter()
  const [name, setName] = useState(product.name)
  const [slug, setSlug] = useState(product.slug)
  const [description, setDescription] = useState(product.description ?? '')
  const [status, setStatus] = useState(product.status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [newPriceName, setNewPriceName] = useState('')
  const [newPriceDollars, setNewPriceDollars] = useState('0')
  const [newPriceInterval, setNewPriceInterval] = useState<
    'none' | 'month' | 'year'
  >('none')
  const [priceError, setPriceError] = useState<string | null>(null)
  const [isPricePending, startPriceTransition] = useTransition()

  const viewHref = `/apps/${appSlug}/plans/${product.slug}`

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const { data, error } = await client.products.update(product.id, {
        slug: slug.trim() || product.slug,
        name: name.trim() || product.name,
        description: description.trim() || null,
        active: status === 'active',
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to update plan.')
        return
      }
      router.push(`/apps/${appSlug}/plans/${data.slug}`)
      router.refresh()
    })
  }

  async function handleArchive() {
    const { error } = await client.products.archive(product.id)
    if (error) {
      toast.error(`Failed to archive "${product.name}": ${error.message}`)
      return
    }
    toast.success(`"${product.name}" archived.`)
    router.push(viewHref)
    router.refresh()
  }

  function handleAddPrice() {
    setPriceError(null)
    const unitAmount = Math.round(Number(newPriceDollars || '0') * 100)
    startPriceTransition(async () => {
      const { error } = await client.products.createPrice(product.id, {
        unit_amount: Number.isFinite(unitAmount) ? unitAmount : 0,
        currency: 'jmd',
        billing_interval: newPriceInterval === 'none' ? null : newPriceInterval,
        name: newPriceName.trim() || undefined,
      })
      if (error) {
        setPriceError(error.message)
        return
      }
      setNewPriceName('')
      setNewPriceDollars('0')
      setNewPriceInterval('none')
      router.refresh()
    })
  }

  return (
    <div className="max-w-2xl space-y-5">
      <section className="876-card p-5">
        <div className="mb-4 flex flex-col gap-1">
          <span className="876-eyebrow">Plan</span>
          <h3 className="text-foreground text-sm font-medium">
            Catalog details and status
          </h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-slug">Slug</Label>
            <Input
              id="plan-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Routes use this value; subscriptions and billing references remain
              linked by ID.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-status">Status</Label>
            <NativeSelect
              id="plan-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'active' | 'archived')
              }
              className="w-full capitalize"
            >
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="archived">Archived</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">
              Description{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          {product.status === 'active' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleArchive()}
            >
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(viewHref)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </section>

      <section className="876-card p-5">
        <div className="mb-4 flex flex-col gap-1">
          <span className="876-eyebrow">Prices</span>
          <h3 className="text-foreground text-sm font-medium">
            Every price point this plan has been sold at
          </h3>
        </div>

        {product.prices.length > 0 && (
          <div className="divide-876-surface-border mb-5 divide-y rounded-lg border">
            {product.prices.map((price) => (
              <div
                key={price.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {price.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="text-sm">
                    {formatPrice(
                      price.unit_amount,
                      price.currency,
                      price.billing_interval
                    )}
                  </span>
                </div>
                <span className="text-muted-foreground font-mono text-xs capitalize">
                  {price.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-price-name">
              Name{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="new-price-name"
              placeholder="e.g. Monthly Standard"
              value={newPriceName}
              onChange={(e) => setNewPriceName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-price">Price (JMD)</Label>
            <Input
              id="new-price"
              type="number"
              min="0"
              step="0.01"
              value={newPriceDollars}
              onChange={(e) => setNewPriceDollars(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-price-interval">Interval</Label>
            <NativeSelect
              id="new-price-interval"
              value={newPriceInterval}
              onChange={(e) =>
                setNewPriceInterval(e.target.value as typeof newPriceInterval)
              }
              className="w-full"
            >
              <NativeSelectOption value="none">
                No recurring charge
              </NativeSelectOption>
              <NativeSelectOption value="month">Monthly</NativeSelectOption>
              <NativeSelectOption value="year">Yearly</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPrice}
            disabled={isPricePending}
          >
            {isPricePending ? 'Adding…' : 'Add price'}
          </Button>
        </div>
        {priceError && (
          <p className="text-destructive mt-2 text-sm">{priceError}</p>
        )}
      </section>
    </div>
  )
}
