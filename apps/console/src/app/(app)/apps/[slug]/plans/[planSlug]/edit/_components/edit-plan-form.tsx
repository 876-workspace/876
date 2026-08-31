'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProduct } from '@876/platform/compat'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { FormRow } from '@876/ui/form-row'
import { toast } from 'sonner'

import { formatMoney } from '@/lib/money'
import { statusBadgeClass } from '@/lib/format'
import { cn } from '@876/core/utils'
import { client } from '@/lib/client'

type Props = { product: AdminProduct; appSlug: string }

const INTERVAL_OPTIONS = [
  { value: 'none', label: 'No recurrence' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
] as const

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
    <div className="space-y-5">
      <section className="876-card space-y-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="876-eyebrow">Plan</span>
          <h3 className="text-foreground text-[0.8125rem] font-medium">
            Catalog details and status
          </h3>
        </div>

        <FormRow label="Name" required>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </FormRow>

        <FormRow
          label="Slug"
          required
          hint="Routes use this value; subscriptions and billing references stay linked by ID."
        >
          <Input
            id="plan-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            spellCheck={false}
            className="font-mono"
          />
        </FormRow>

        <FormRow label="Status" required>
          <RadioGroup
            value={status}
            onValueChange={(value) => setStatus(value as 'active' | 'archived')}
            disabled={isPending}
            className="grid-flow-col justify-start gap-6 pt-1"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="active" />
              Active
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="archived" />
              Archived
            </label>
          </RadioGroup>
        </FormRow>

        <FormRow label="Description">
          <Input
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormRow>

        {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}

        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-4">
          {product.status === 'active' ? (
            <Button
              type="button"
              variant="destructive"
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

      <section className="876-card space-y-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="876-eyebrow">Prices</span>
          <h3 className="text-foreground text-[0.8125rem] font-medium">
            Every price point this plan has been sold at
          </h3>
        </div>

        {product.prices.length > 0 && (
          <div className="divide-876-surface-border mb-2 divide-y rounded-lg border">
            {product.prices.map((price) => (
              <div
                key={price.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[0.8125rem] font-medium">
                    {price.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="text-[0.8125rem] tabular-nums">
                    {formatMoney(price.unit_amount, price.currency)}
                    {price.billing_interval
                      ? ` / ${price.billing_interval}`
                      : ''}
                  </span>
                </div>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                    statusBadgeClass(price.status)
                  )}
                >
                  {price.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <div className="space-y-5">
            <FormRow label="Name" hint="Optional label for this price point.">
              <Input
                id="new-price-name"
                placeholder="e.g. Monthly Standard"
                value={newPriceName}
                onChange={(e) => setNewPriceName(e.target.value)}
              />
            </FormRow>
            <FormRow label="Price (JMD)" required>
              <Input
                id="new-price"
                type="number"
                min="0"
                step="0.01"
                value={newPriceDollars}
                onChange={(e) => setNewPriceDollars(e.target.value)}
              />
            </FormRow>
            <FormRow label="Interval" required>
              <RadioGroup
                value={newPriceInterval}
                onValueChange={(value) =>
                  setNewPriceInterval(value as 'none' | 'month' | 'year')
                }
                disabled={isPricePending}
                className="grid-flow-col justify-start gap-x-6 gap-y-2 pt-1"
              >
                {INTERVAL_OPTIONS.map((option) => (
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
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddPrice}
              disabled={isPricePending}
            >
              {isPricePending ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {priceError && (
            <p className="text-destructive mt-2 text-[0.8125rem]">
              {priceError}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
