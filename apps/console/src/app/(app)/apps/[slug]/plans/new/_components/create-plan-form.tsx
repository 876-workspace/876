'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Skeleton } from '@876/ui/skeleton'
import { AppError } from '@876/ui/app-error'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import type { AppError as AppErrorValue } from '@876/core/types/errors'
import { cn } from '@876/core/utils'

import { PlanModulePicker } from '@/features/plans/components/plan-module-picker'
import { useAsyncValue } from '@/hooks/use-async-value'
import { client } from '@/lib/client'
import type { CreatePlanSetup } from '@/types/plans'

type Step = 'details' | 'modules'

const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'modules', label: 'Modules' },
]

/**
 * Sits beside the card title, so it is sized to the title's 28px line — a 16px
 * number over a 10px label — and never grows the header.
 */
function PlanSteps({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.key === step)

  return (
    <ol aria-label="Plan setup steps" className="flex items-start gap-2">
      {STEPS.map((item, index) => {
        const reached = index <= current

        return (
          <li key={item.key} className="flex items-start gap-2">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'mt-2 h-px w-6',
                  reached ? 'bg-primary' : 'bg-border'
                )}
              />
            ) : null}
            <div
              className="flex flex-col items-center gap-0.5"
              aria-current={index === current ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[0.5625rem] leading-none font-semibold',
                  reached
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-[0.625rem] leading-none font-medium',
                  reached ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

type Props = {
  appSlug: string
  setup: CreatePlanSetup | Promise<CreatePlanSetup>
}

export function CreatePlanForm({ appSlug, setup }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [step, setStep] = useState<Step>('details')
  const setupState = useAsyncValue(setup)
  const setupData = setupState.value?.data
  const setupError = setupState.value?.error

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [priceDollars, setPriceDollars] = useState('0')
  const [billingInterval, setBillingInterval] = useState<
    'none' | 'month' | 'year'
  >('none')
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])

  function handleSubmit() {
    if (!name.trim() || !slug.trim() || !setupData) return
    setError(null)
    const unitAmount = Math.round(Number(priceDollars || '0') * 100)
    const { appId } = setupData

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
      if (error) {
        setError(error)
        return
      }
      router.push(`/apps/${appSlug}/plans/${data.slug}`)
      router.refresh()
    })
  }

  return (
    <DetailCard aria-label="New plan">
      <DetailCardHeader
        title="New Plan"
        meta={<PlanSteps step={step} />}
        closeHref={`/apps/${appSlug}/plans`}
        closeLabel="Close new plan"
      />
      <DetailCardBody>
        <div className="max-w-3xl space-y-5">
          {step === 'details' ? (
            <section>
              <div className="mb-4 flex flex-col gap-1">
                <span className="876-eyebrow">Step 1 of 2</span>
                <h3 className="text-foreground text-[0.8125rem] font-medium">
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
                      setBillingInterval(
                        e.target.value as typeof billingInterval
                      )
                    }
                    className="w-full"
                  >
                    <NativeSelectOption value="none">
                      No recurring charge
                    </NativeSelectOption>
                    <NativeSelectOption value="month">
                      Monthly
                    </NativeSelectOption>
                    <NativeSelectOption value="year">Yearly</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-3">
              <div>
                <span className="876-eyebrow">Step 2 of 2</span>
                <h3 className="text-foreground mt-1 text-[0.8125rem] font-medium">
                  Included modules
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Subscribers receive these durable product capabilities. Any
                  linked feature flag remains an independent rollout kill
                  switch.
                </p>
              </div>

              {setupState.pending ? (
                <div className="space-y-3" aria-label="Loading modules">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : setupError ? (
                <AppError
                  title="Modules could not be loaded"
                  error={setupError}
                  variant="inline"
                  showCode
                />
              ) : setupState.error ? (
                <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
                  Modules could not be loaded. Refresh the page to try again.
                </div>
              ) : (
                <PlanModulePicker
                  modules={setupData?.modules ?? []}
                  selectedModuleIds={selectedModuleIds}
                  onSelectedModuleIdsChange={setSelectedModuleIds}
                  disabled={isPending}
                />
              )}

              {error && <AppError error={error} variant="inline" showCode />}
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
              <Button
                onClick={handleSubmit}
                disabled={isPending || setupState.pending || !setupData}
              >
                {isPending ? 'Creating…' : 'Create plan'}
              </Button>
            )}
          </div>
        </div>
      </DetailCardBody>
    </DetailCard>
  )
}
