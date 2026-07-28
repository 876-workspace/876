import { Page } from '@876/ui/page'
import { WIDGET_HOST_APP_SLUGS } from '@876/widgets'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import {
  CONSOLE_WIDGETS_FEATURE_SLUG,
  consoleWidgetCatalog,
  getConsoleWidgetDetailHref,
  getConsoleWidgetStatusFeatureSlug,
} from '@/components/widgets/widget-catalog'
import { $876 } from '@/lib/876'

import { WidgetsTable, type WidgetTableRow } from './widgets-table'

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
  const allWidgetsFeature = features.get(CONSOLE_WIDGETS_FEATURE_SLUG)
  const visibleWidgets = consoleWidgetCatalog.filter(
    (widget) => distribution === 'all' || widget.distribution === distribution
  )

  // The global switch is pinned to the top of the list and is deliberately
  // exempt from the distribution filter — it governs every widget regardless
  // of which subset is on screen.
  const masterRow: WidgetTableRow = {
    kind: 'master',
    id: CONSOLE_WIDGETS_FEATURE_SLUG,
    name: 'All widgets',
    description: 'Global switch for every widget in Console.',
    apps: ['Console'],
    feature: allWidgetsFeature
      ? {
          id: allWidgetsFeature.id,
          name: allWidgetsFeature.name,
          enabled: allWidgetsFeature.enabled,
        }
      : null,
    missingFeatureSlug: allWidgetsFeature ? null : CONSOLE_WIDGETS_FEATURE_SLUG,
  }

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

      <WidgetsTable data={[masterRow, ...widgetRows]} />
    </Page>
  )
}
