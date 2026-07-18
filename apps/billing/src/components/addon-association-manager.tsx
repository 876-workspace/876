'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type EventType = 'SUBSCRIPTION_ACTIVATION' | 'PLAN_CHANGE' | 'TRIAL_ACTIVATION'
type AssociationState = {
  enabled: boolean
  associationType: 'OPTIONAL' | 'RECOMMENDED' | 'MANDATORY'
  events: EventType[]
  frequency: 'EVERY_OCCURRENCE' | 'FIRST_OCCURRENCE'
}

export function AddonAssociationManager({
  addonId,
  plans,
  associations,
}: {
  addonId: string
  plans: { id: string; name: string }[]
  associations: Array<AssociationState & { planId: string }>
}) {
  const router = useRouter()
  const initial = useMemo(
    () =>
      Object.fromEntries(
        plans.map((plan) => {
          const association = associations.find(
            (candidate) => candidate.planId === plan.id
          )
          return [
            plan.id,
            association ?? {
              enabled: false,
              associationType: 'OPTIONAL',
              events: ['SUBSCRIPTION_ACTIVATION'],
              frequency: 'EVERY_OCCURRENCE',
            },
          ]
        })
      ) as Record<string, AssociationState>,
    [associations, plans]
  )
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function patchPlan(planId: string, patch: Partial<AssociationState>) {
    setValues((current) => ({
      ...current,
      [planId]: { ...current[planId]!, ...patch },
    }))
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        const changed = plans.filter(
          (plan) =>
            JSON.stringify(values[plan.id]) !== JSON.stringify(initial[plan.id])
        )
        if (changed.length === 0) return
        setError(null)
        startTransition(async () => {
          const result = await client.addons.upsertAssociations(
            addonId,
            changed.map((plan) => {
              const value = values[plan.id]!
              return {
                planId: plan.id,
                associationType: value.associationType,
                events: value.events,
                frequency: value.frequency,
                isActive: value.enabled,
              }
            })
          )
          if (result.error) {
            setError(result.error.message)
            return
          }
          router.refresh()
        })
      }}
    >
      <div className="876-card overflow-hidden">
        {plans.length ? (
          <div className="divide-y">
            {plans.map((plan) => {
              const value = values[plan.id]!
              return (
                <div key={plan.id} className="space-y-4 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <label className="flex min-w-0 flex-1 items-center gap-3 font-medium">
                      <input
                        type="checkbox"
                        checked={value.enabled}
                        onChange={(event) =>
                          patchPlan(plan.id, { enabled: event.target.checked })
                        }
                      />
                      {plan.name}
                    </label>
                    <NativeSelect
                      aria-label={`${plan.name} availability`}
                      value={value.associationType}
                      disabled={!value.enabled}
                      onChange={(event) =>
                        patchPlan(plan.id, {
                          associationType: event.target
                            .value as AssociationState['associationType'],
                        })
                      }
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
                  {value.enabled ? (
                    <div className="grid gap-3 pl-7 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="flex flex-wrap gap-4">
                        {EVENT_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={value.events.includes(option.value)}
                              onChange={(event) => {
                                const events = event.target.checked
                                  ? [...value.events, option.value]
                                  : value.events.filter(
                                      (entry) => entry !== option.value
                                    )
                                if (events.length)
                                  patchPlan(plan.id, { events })
                              }}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                      <NativeSelect
                        aria-label={`${plan.name} frequency`}
                        value={value.frequency}
                        onChange={(event) =>
                          patchPlan(plan.id, {
                            frequency: event.target
                              .value as AssociationState['frequency'],
                          })
                        }
                      >
                        <NativeSelectOption value="EVERY_OCCURRENCE">
                          Every occurrence
                        </NativeSelectOption>
                        <NativeSelectOption value="FIRST_OCCURRENCE">
                          First occurrence
                        </NativeSelectOption>
                      </NativeSelect>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground p-5 text-sm">
            No compatible active plans are available.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || plans.length === 0}>
          {isPending ? 'Saving…' : 'Save plan availability'}
        </Button>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    </form>
  )
}

const EVENT_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'SUBSCRIPTION_ACTIVATION', label: 'Subscription activation' },
  { value: 'PLAN_CHANGE', label: 'Plan change' },
  { value: 'TRIAL_ACTIVATION', label: 'Trial activation' },
]
