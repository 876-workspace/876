import { Page } from '@876/ui/page'
import { WIDGET_HOST_APP_SLUGS } from '@876/widgets'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import {
  widgetCatalog,
  getConsoleWidgetDetailHref,
  getConsoleWidgetStatusFeatureSlug,
} from '@/features/widgets/widget-catalog'
import { $876 } from '@/lib/876'

import { WidgetsTable, type WidgetTableRow } from './_components/widgets-table'

export const metadata = { title: 'Widgets' }

const DISTRIBUTION_OPTIONS = [
  { value: 'all', label: 'All widgets', headingLabel: 'Widgets' },
  { value: 'shared', label: 'Shared widgets' },
  { value: 'host', label: 'App-only widgets' },
]

const HOST_LABELS = {
  console: 'Console',
  billing: '876 Billing',
  couriers: '876 Couriers',
  enterprise: '876 Enterprise',
  '876': '876',
} as const

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ distribution?: string }>
}) {
  const requestedDistribution = (await searchParams).distribution
  const distribution =
    requestedDistribution === 'shared' || requestedDistribution === 'host'
      ? requestedDistribution
      : 'all'
  const [featuresResult, appsResult] = await Promise.all([
    $876.features.list({ limit: 100, includeTag: 'widget' }),
    $876.apps.list({ limit: 100, clientType: 'public' }),
  ])
  const features = new Map(
    (featuresResult.data?.data ?? []).map((feature) => [feature.slug, feature])
  )
  const apps = new Map(
    (appsResult.data?.data ?? []).map((app) => [app.slug, app])
  )
  const visibleWidgets = widgetCatalog.filter(
    (widget) => distribution === 'all' || widget.distribution === distribution
  )

  const widgetRows: WidgetTableRow[] = visibleWidgets.map((widget) => {
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
        widget.supportedHosts.length === Object.keys(HOST_LABELS).length
          ? 'all'
          : widget.supportedHosts.map(
              (host) =>
                apps.get(WIDGET_HOST_APP_SLUGS[host])?.name ?? HOST_LABELS[host]
            ),
      feature: feature
        ? { id: feature.id, name: feature.name, enabled: feature.enabled }
        : null,
      missingFeatureSlug: feature ? null : statusSlug,
    }
  })

  return (
    <Page>
      <ResourceToolbar
        title="Widgets"
        titleFilter={
          <StatusFilterHeading
            label="Widgets"
            value={distribution}
            options={DISTRIBUTION_OPTIONS}
            paramKey="distribution"
          />
        }
        primaryLabel="Add"
        primaryHref="/widgets/new"
        primaryVariant="info"
        refresh
      />

      <WidgetsTable data={widgetRows} />
    </Page>
  )
}
