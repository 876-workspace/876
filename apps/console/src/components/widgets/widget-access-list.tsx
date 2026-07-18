import Link from 'next/link'
import type { WidgetMetadata } from '@876/widgets'
import { getWidgetFeatureSlugs } from '@876/widgets'
import { buttonVariants } from '@876/ui/button'

import { $876 } from '@/lib/876'

import { WidgetFeatureToggle } from './widget-feature-toggle'

export async function WidgetAccessList({ widget }: { widget: WidgetMetadata }) {
  const widgetKeys = new Set(getWidgetFeatureSlugs(widget))
  const [featuresResult, appsResult] = await Promise.all([
    $876.features.list({ limit: 100, includeTag: 'widget' }),
    $876.apps.list({ limit: 100, clientType: 'public' }),
  ])
  const apps = new Map(
    (appsResult.data?.data ?? []).map((app) => [app.id, app])
  )
  const features = (featuresResult.data?.data ?? []).filter((feature) =>
    widgetKeys.has(feature.slug)
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Access layers</h2>
        <p className="text-muted-foreground text-sm">
          Global and app switches combine with organization and user overrides.
        </p>
      </div>
      <div className="876-card divide-876-surface-border divide-y">
        {features.map((feature) => {
          const app = feature.app_id ? apps.get(feature.app_id) : null
          const href = app
            ? `/apps/${app.slug}/features/${feature.id}/access`
            : `/features/${feature.id}/entitlements`
          return (
            <div
              key={feature.id}
              className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <span className="min-w-0">
                <span className="font-medium">{feature.name}</span>
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {feature.slug}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <WidgetFeatureToggle feature={feature} />
                <Link
                  href={href}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                >
                  Access
                </Link>
              </span>
            </div>
          )
        })}
        {features.length === 0 && (
          <p className="text-muted-foreground p-5 text-sm">
            No feature controls are registered for this widget.
          </p>
        )}
      </div>
    </div>
  )
}
