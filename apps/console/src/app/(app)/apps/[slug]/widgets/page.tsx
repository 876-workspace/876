import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { WidgetHost } from '@876/widgets'
import { getWidgetAppFeatureKeys, WIDGET_HOST_APP_SLUGS } from '@876/widgets'
import { buttonVariants } from '@876/ui/button'

import { consoleWidgetCatalog } from '@/components/widgets/widget-catalog'
import { WidgetFeatureToggle } from '@/components/widgets/widget-feature-toggle'
import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'

export default async function AppWidgetsPage({
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
    ? consoleWidgetCatalog.filter((widget) =>
        getWidgetAppFeatureKeys(widget, host)
      )
    : []
  const result = await $876.apps.features.list(app.id, {
    limit: 100,
    includeTag: 'widget',
  })
  const features = new Map(
    (result.data?.data ?? []).map((feature) => [feature.slug, feature])
  )
  const masterSlug =
    host && widgets[0]
      ? getWidgetAppFeatureKeys(widgets[0], host)?.parent
      : undefined
  const master = masterSlug ? features.get(masterSlug) : undefined

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium">Widgets</h2>
        <p className="text-muted-foreground text-sm">
          Configure widget access for {app.name}. Organization and user
          overrides remain available from each Access page.
        </p>
      </div>

      {masterSlug && (
        <section className="876-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold">All widgets in {app.name}</h3>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              {masterSlug}
            </p>
          </div>
          {master ? (
            <div className="flex items-center gap-3">
              <WidgetFeatureToggle feature={master} />
              <Link
                href={`/apps/${slug}/features/${master.id}/access`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Access
              </Link>
            </div>
          ) : (
            <MissingFlag slug={masterSlug} />
          )}
        </section>
      )}

      <div className="876-card divide-876-surface-border divide-y overflow-hidden">
        {widgets.map((widget) => {
          const keys = host ? getWidgetAppFeatureKeys(widget, host) : undefined
          if (!keys) return null
          const feature = features.get(keys.widget)
          return (
            <div
              key={widget.id}
              className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">{widget.name}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {widget.description}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {keys.widget}
                </p>
              </div>
              {feature ? (
                <>
                  <WidgetFeatureToggle feature={feature} />
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/apps/${slug}/features/${feature.id}/access`}
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      Access
                    </Link>
                    {widget.administration.canListContent && (
                      <Link
                        href={`/widgets/${widget.id}/data`}
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                        })}
                      >
                        Data
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <MissingFlag slug={keys.widget} />
              )}
            </div>
          )
        })}
        {widgets.length === 0 && (
          <p className="text-muted-foreground p-5 text-sm">
            No widgets are registered for this app.
          </p>
        )}
      </div>
    </div>
  )
}

function MissingFlag({ slug }: { slug: string }) {
  return (
    <span className="text-muted-foreground rounded-md border px-2 py-1 font-mono text-xs">
      Missing: {slug}
    </span>
  )
}
