'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { PlanModulePicker } from '@/components/plan-module-picker'
import { client } from '@/lib/client'
import type { PlanModuleOption } from '@/types/plans'

type Props = {
  appId: string
  appSlug: string
  modules: PlanModuleOption[]
}

export function CreatePlanForm({ appId, appSlug, modules }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'details' | 'modules'>('details')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [priceDollars, setPriceDollars] = useState('0')
  const [billingInterval, setBillingInterval] = useState<
    'none' | 'month' | 'year'
  >('none')
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])

  function handleSubmit() {
    if (!name.trim() || !slug.trim()) return
    setError(null)
    const unitAmount = Math.round(Number(priceDollars || '0') * 100)
    startTransition(async () => {
      const { data, error } = await client.products.create({
        slug: slug.trim(),
        name: name.trim(),
        app_id: appId,
        module_ids: selectedModuleIds,
        price: {
          unit_amount: Number.isFinite(unitAmount) ? unitAmount : 0,
          currency: 'jmd',
          billing_interval: billingInterval === 'none' ? null : billingInterval,
        },
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to create plan.')
        return
      }
      router.push(`/apps/${appSlug}/plans/${data.slug}`)
      router.refresh()
    })
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="876-card flex items-center gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
            1
          </span>
          <span className="text-foreground text-sm font-medium">Details</span>
        </div>
        <span className="bg-border h-px flex-1" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span
            className={
              step === 'modules'
                ? 'bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold'
                : 'bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold'
            }
          >
            2
          </span>
          <span
            className={
              step === 'modules'
                ? 'text-foreground text-sm font-medium'
                : 'text-muted-foreground text-sm font-medium'
            }
          >
            Modules
          </span>
        </div>
      </div>

      {step === 'details' ? (
        <section className="876-card p-5">
          <div className="mb-4 flex flex-col gap-1">
            <span className="876-eyebrow">Step 1 of 2</span>
            <h3 className="text-foreground text-sm font-medium">
              Catalog details and starting price
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder="e.g. Free"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-slug"
                placeholder="e.g. 876-couriers-pro"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                spellCheck={false}
                className="font-mono"
                required
              />
              <p className="text-muted-foreground text-xs">
                The unique catalog identifier. Cannot be changed later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-price">Price (JMD)</Label>
              <Input
                id="plan-price"
                type="number"
                min="0"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-interval">Billing interval</Label>
              <NativeSelect
                id="plan-interval"
                value={billingInterval}
                onChange={(e) =>
                  setBillingInterval(e.target.value as typeof billingInterval)
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
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div>
            <span className="876-eyebrow">Step 2 of 2</span>
            <h3 className="text-foreground mt-1 text-sm font-medium">
              Included modules
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Subscribers receive these durable product capabilities. Any linked
              feature flag remains an independent rollout kill switch.
            </p>
          </div>
          <PlanModulePicker
            modules={modules}
            selectedModuleIds={selectedModuleIds}
            onSelectedModuleIdsChange={setSelectedModuleIds}
            disabled={isPending}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </section>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            step === 'details'
              ? router.push(`/apps/${appSlug}/plans`)
              : setStep('details')
          }
          disabled={isPending}
        >
          {step === 'details' ? 'Cancel' : 'Back'}
        </Button>
        {step === 'details' ? (
          <Button
            onClick={() => setStep('modules')}
            disabled={!name.trim() || !slug.trim()}
          >
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating…' : 'Create plan'}
          </Button>
        )}
      </div>
    </div>
  )
}
