import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { WidgetHost } from '@876/widgets'
import {
  getWidgetAppFeatureKeys,
  getWidgetPlatformFeatureKeys,
  WIDGET_HOST_APP_SLUGS,
} from '@876/widgets'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { ChevronRight } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import {
  widgetCatalog,
  getConsoleWidgetDetailHref,
} from '@/features/widgets/widget-catalog'
import { WidgetCatalogIcon } from '@/features/widgets/components/widget-catalog-icon'
import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'

/**
 * A read-only lens, deliberately. "What does this app expose?" is a real
 * question and worth a tab, but a widget is managed in one place — its own
 * page under /widgets — so the flags, targeting and data have a single home.
 * Editing here as well is what produced two divergent toggle UIs for the same
 * flags, and an admin who could not tell which one they had just changed.
 */
export default function AppWidgetsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium">Widgets</h2>

      <Suspense fallback={<AppWidgetsFallback />}>
        <AppWidgetsData params={params} />
      </Suspense>

      <Link
        href="/widgets"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Manage widgets
      </Link>
    </div>
  )
}

async function AppWidgetsData({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const host = (
    Object.entries(WIDGET_HOST_APP_SLUGS) as [WidgetHost, string][]
  ).find(([, appSlug]) => appSlug === app.slug)?.[0]

  const widgets = host
    ? widgetCatalog.filter((widget) => getWidgetAppFeatureKeys(widget, host))
    : []

  if (widgets.length === 0) {
    return (
      <div className="876-card p-5">
        <p className="text-muted-foreground text-[0.8125rem]">
          No widgets are registered for this app.
        </p>
      </div>
    )
  }

  const result = await $876.features.admin.list({
    limit: 100,
    includeTag: 'widget',
  })
  const features = new Map(
    (result.data?.data ?? []).map((feature) => [feature.slug, feature])
  )

  return (
    <div className="876-card divide-876-surface-border divide-y overflow-hidden">
      {widgets.map((widget) => {
        const keys = host ? getWidgetAppFeatureKeys(widget, host) : undefined
        if (!keys) return null
        const feature = features.get(keys.widget)
        const master = features.get(keys.parent)
        const platformKeys = getWidgetPlatformFeatureKeys(widget)
        const platformMaster = platformKeys
          ? features.get(platformKeys.parent)
          : null
        const platformFeature = platformKeys
          ? features.get(platformKeys.widget)
          : null
        const live = Boolean(
          master?.enabled &&
          feature?.enabled &&
          (!platformKeys ||
            (platformMaster?.enabled && platformFeature?.enabled))
        )

        return (
          <Link
            key={widget.id}
            href={getConsoleWidgetDetailHref(widget)}
            className="hover:bg-muted/40 flex items-center gap-4 p-5 transition-colors"
          >
            <WidgetCatalogIcon visual={widget.visual} />

            <div className="min-w-0 flex-1">
              <p className="font-medium">{widget.name}</p>
              <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                {keys.widget}
              </p>
            </div>

            {feature ? (
              <Badge variant={live ? 'success' : 'secondary'}>
                {live ? 'Available' : 'Off'}
              </Badge>
            ) : (
              <span className="text-muted-foreground font-mono text-xs">
                Missing: {keys.widget}
              </span>
            )}

            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        )
      })}
    </div>
  )
}

function AppWidgetsFallback() {
  return (
    <div className="876-card divide-876-surface-border divide-y overflow-hidden">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 p-5">
          <Skeleton className="size-10 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}
