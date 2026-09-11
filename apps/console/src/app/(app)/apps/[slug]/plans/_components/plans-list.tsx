'use client'

import type { AdminProduct } from '@876/platform/compat'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { usePathDetailSegments } from '@876/ui/list-detail-shell'

import { formatPrice, PlansTable } from './plans-table'

/**
 * The list column in both of its forms: the full-width table when no plan is
 * open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width.
 */
export function PlansList({
  data,
  appSlug,
}: {
  data: AdminProduct[]
  appSlug: string
}) {
  // Rendered inside the `@list` slot, where layout segments describe the slot
  // rather than the open record, so selection comes from the pathname.
  const segments = usePathDetailSegments(`/apps/${appSlug}/plans`)
  const selectedSlug = segments[0] ?? null

  if (selectedSlug) {
    return (
      <ListPane>
        <ListPaneBody>
          {data.length === 0 ? (
            <ListPaneEmpty>No plans yet</ListPaneEmpty>
          ) : (
            data.map((product) => (
              <ListPaneItem
                key={product.id}
                href={`/apps/${appSlug}/plans/${product.slug}`}
                selected={product.slug === selectedSlug}
                label={`View plan ${product.name}`}
                title={product.name}
                subtitle={`${product.slug} · ${formatPrice(product)}`}
              />
            ))
          )}
        </ListPaneBody>
      </ListPane>
    )
  }

  return <PlansTable data={data} appSlug={appSlug} />
}
