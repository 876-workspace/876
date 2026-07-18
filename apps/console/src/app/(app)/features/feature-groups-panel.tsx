'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminFeature } from '@876/admin'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { FeatureGroup } from '@/lib/feature-groups'

type Props = {
  appSlug?: string
  groups: FeatureGroup[]
  features: AdminFeature[]
}

type FeatureState = Pick<AdminFeature, 'id' | 'slug' | 'enabled' | 'name'>

export function FeatureGroupsPanel({ appSlug, groups, features }: Props) {
  const [featureState, setFeatureState] = useState<
    Record<string, FeatureState>
  >(() =>
    Object.fromEntries(
      features.map((feature) => [
        feature.slug,
        {
          id: feature.id,
          slug: feature.slug,
          enabled: feature.enabled,
          name: feature.name,
        },
      ])
    )
  )
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)

  async function toggleFeature(feature: FeatureState) {
    const next = !feature.enabled
    setPendingSlug(feature.slug)
    setFeatureState((current) => ({
      ...current,
      [feature.slug]: { ...feature, enabled: next },
    }))

    const { error } = await client.features.update(feature.id, {
      enabled: next,
    })
    setPendingSlug(null)
    if (error) {
      setFeatureState((current) => ({
        ...current,
        [feature.slug]: feature,
      }))
      toast.error(error.message)
      return
    }

    toast.success(`${feature.name} ${next ? 'enabled' : 'disabled'}.`)
  }

  if (groups.length === 0) return null

  return (
    <div className="mb-5 grid gap-4 xl:grid-cols-2">
      {groups.map((group) => {
        const master = featureState[group.masterSlug]
        const children = group.items.map((item) => ({
          ...item,
          feature: featureState[item.slug],
        }))

        return (
          <section key={group.id} className="876-card overflow-hidden">
            <div className="border-876-surface-border flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">
                  {group.title}
                </h2>
                <p className="text-muted-foreground mt-1 truncate text-sm">
                  {children.length} feature flags
                </p>
              </div>

              {master ? (
                <div className="flex items-center gap-3">
                  <FeatureSwitch
                    feature={master}
                    pending={pendingSlug === master.slug}
                    onToggle={() => toggleFeature(master)}
                  />
                  <Link
                    href={featureAccessHref(master.id, appSlug)}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Access
                  </Link>
                </div>
              ) : (
                <MissingFlag />
              )}
            </div>

            <div className="divide-876-surface-border divide-y">
              {children.map(({ feature, label, slug }) => (
                <div
                  key={slug}
                  className="grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="text-muted-foreground truncate font-mono text-xs">
                      {slug}
                    </p>
                  </div>

                  {feature ? (
                    <>
                      <FeatureSwitch
                        feature={feature}
                        pending={pendingSlug === feature.slug}
                        onToggle={() => toggleFeature(feature)}
                      />
                      <Link
                        href={featureAccessHref(feature.id, appSlug)}
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                        })}
                      >
                        Access
                      </Link>
                    </>
                  ) : (
                    <MissingFlag />
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function featureAccessHref(featureId: string, appSlug?: string): string {
  if (appSlug) return `/apps/${appSlug}/features/${featureId}/access`

  return `/features/${featureId}/entitlements`
}

function FeatureSwitch({
  feature,
  pending,
  onToggle,
}: {
  feature: FeatureState
  pending: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={feature.enabled}
        onCheckedChange={onToggle}
        disabled={pending}
        aria-label={`Toggle ${feature.name}`}
      />
      <span
        className={cn(
          'w-16 text-xs font-medium',
          feature.enabled
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted-foreground'
        )}
      >
        {feature.enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

function MissingFlag() {
  return (
    <span className="text-muted-foreground rounded-md border px-2 py-1 text-xs">
      Missing
    </span>
  )
}
