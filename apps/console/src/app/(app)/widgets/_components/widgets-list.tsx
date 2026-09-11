'use client'

import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import {
  widgetCatalog,
  getWidgetRouteSlug,
} from '@/features/widgets/widget-catalog'

import { WidgetsTable, type WidgetTableRow } from './widgets-table'

const DISTRIBUTION_BY_ID: Map<string, string> = new Map(
  widgetCatalog.map((widget) => [widget.id, widget.distribution])
)
const ROUTE_SLUG_BY_ID: Map<string, string> = new Map(
  widgetCatalog.map((widget) => [widget.id, getWidgetRouteSlug(widget)])
)

/**
 * The list column in both of its forms: the full-width table when no widget is
 * open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width, and the distribution filter is applied
 * in one place rather than twice.
 */
export function WidgetsList({ rows }: { rows: WidgetTableRow[] }) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedSlug = segments[0] ?? null

  const requestedDistribution = searchParams.get('distribution')
  const distribution =
    requestedDistribution === 'shared' || requestedDistribution === 'host'
      ? requestedDistribution
      : 'all'

  const distributionById = DISTRIBUTION_BY_ID
  const routeSlugById = ROUTE_SLUG_BY_ID
  const visible =
    distribution === 'all'
      ? rows
      : rows.filter((row) => distributionById.get(row.id) === distribution)

  if (!selectedSlug) return <WidgetsTable data={visible} />

  return (
    <ListPane>
      <ListPaneBody>
        {visible.length === 0 ? (
          <ListPaneEmpty>No widgets match this view</ListPaneEmpty>
        ) : (
          visible.map((row) => {
            if (row.kind !== 'widget') return null
            const href = query ? `${row.detailHref}?${query}` : row.detailHref
            const apps = row.apps === 'all' ? 'All apps' : row.apps.join(', ')

            return (
              <ListPaneItem
                key={row.id}
                href={href}
                selected={routeSlugById.get(row.id) === selectedSlug}
                label={`View ${row.name} widget`}
                title={row.name}
                subtitle={apps}
                trailing={
                  row.feature ? (
                    <Badge
                      variant={row.feature.enabled ? 'outline' : 'secondary'}
                    >
                      {row.feature.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ) : null
                }
              />
            )
          })
        )}
      </ListPaneBody>
    </ListPane>
  )
}
