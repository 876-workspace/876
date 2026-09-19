import { platform } from '@/lib/clients/platform'
import { workspace } from '@/lib/clients/workspace'
import { WIDGET_HOST_APP_SLUGS, WIDGET_HOST_LABELS } from '@876/widgets'

import {
  widgetCatalog,
  getConsoleWidgetDetailHref,
  getConsoleWidgetStatusFeatureSlug,
} from '@/features/widgets/widget-catalog'

import { WidgetsList } from './widgets-list'
import type { WidgetTableRow } from './widgets-table'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves. Fetches the
 * whole catalog once — the distribution filter is applied client-side in
 * `WidgetsList`, because a layout receives no `searchParams`.
 */
export async function WidgetsListData() {
  const [featuresResult, appsResult] = await Promise.all([
    workspace.features.list({ limit: 100, includeTag: 'widget' }),
    platform.apps.list({ limit: 100, clientType: 'public' }),
  ])
  const features = new Map(
    (featuresResult.data?.data ?? []).map((feature) => [feature.slug, feature])
  )
  const apps = new Map(
    (appsResult.data?.data ?? []).map((app) => [app.slug, app])
  )

  const widgetRows: WidgetTableRow[] = widgetCatalog.map((widget) => {
    const statusSlug = getConsoleWidgetStatusFeatureSlug(widget)
    const feature = statusSlug ? features.get(statusSlug) : undefined

    return {
      kind: 'widget',
      id: widget.id,
      name: widget.name,
      description: widget.description,
      detailHref: getConsoleWidgetDetailHref(widget),
      visual: widget.visual,
      apps:
        widget.supportedHosts.length === Object.keys(WIDGET_HOST_LABELS).length
          ? 'all'
          : widget.supportedHosts.map(
              (host) =>
                apps.get(WIDGET_HOST_APP_SLUGS[host])?.name ??
                WIDGET_HOST_LABELS[host]
            ),
      feature: feature
        ? { id: feature.id, name: feature.name, enabled: feature.enabled }
        : null,
      missingFeatureSlug: feature ? null : statusSlug,
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <WidgetsList rows={widgetRows} />
    </div>
  )
}
