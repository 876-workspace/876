'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AdminFeature } from '@876/admin'
import { buttonVariants } from '@876/ui/button'
import { Switch } from '@876/ui/switch'
import { toast } from 'sonner'

import { client } from '@/lib/client'

type Props = {
  appSlug: string
  parentFeature: AdminFeature
  childFeatures: AdminFeature[]
}

export function FeatureChildrenPanel({
  appSlug,
  parentFeature,
  childFeatures,
}: Props) {
  const router = useRouter()
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      childFeatures.map((childFeature) => [
        childFeature.id,
        childFeature.enabled,
      ])
    )
  )
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function toggleFeature(feature: AdminFeature) {
    const next = !enabledById[feature.id]
    setPendingId(feature.id)
    setEnabledById((current) => ({ ...current, [feature.id]: next }))

    const { error } = await client.features.update(feature.id, {
      enabled: next,
    })
    setPendingId(null)
    if (error) {
      setEnabledById((current) => ({
        ...current,
        [feature.id]: feature.enabled,
      }))
      toast.error(error.message)
      return
    }

    toast.success(`${feature.name} ${next ? 'enabled' : 'disabled'}.`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <section className="876-card overflow-hidden">
        {childFeatures.length === 0 ? (
          <p className="text-muted-foreground px-5 py-4 text-sm">
            No child features have been created yet.
          </p>
        ) : (
          <div className="divide-876-surface-border divide-y">
            {childFeatures.map((childFeature) => (
              <div
                key={childFeature.id}
                className="grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <Link
                    href={`/apps/${appSlug}/features/${childFeature.id}`}
                    className="hover:text-primary block truncate text-sm font-medium"
                  >
                    {childFeature.name}
                  </Link>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {childFeature.slug}
                  </p>
                </div>
                <Switch
                  checked={
                    parentFeature.enabled
                      ? (enabledById[childFeature.id] ?? childFeature.enabled)
                      : false
                  }
                  disabled={
                    pendingId === childFeature.id || !parentFeature.enabled
                  }
                  onCheckedChange={() => toggleFeature(childFeature)}
                  aria-label={`Toggle ${childFeature.name}`}
                />
                <Link
                  href={`/apps/${appSlug}/features/${childFeature.id}/access`}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                >
                  Access
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
