'use client'

import type { AdminFeature } from '@876/platform/compat'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { usePathDetailSegments } from '@876/ui/list-detail-shell'

import { AppFeaturesTable } from './features-table'

/**
 * The list column in both of its forms: the full-width table when no feature
 * is open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width. The query-aware parallel route owns
 * server-side search filtering and pagination.
 */
export function FeaturesList({
  appSlug,
  data,
  query,
  moduleFeatureIds,
  hasMore,
  firstId,
  lastId,
  toolbarAction,
  emptyState,
}: {
  appSlug: string
  data: AdminFeature[]
  query: string
  moduleFeatureIds: string[]
  hasMore: boolean
  firstId: string | null
  lastId: string | null
  toolbarAction?: React.ReactNode
  emptyState?: React.ReactNode
}) {
  // Rendered inside the `@list` slot, where layout segments describe the slot
  // rather than the open record, so selection comes from the pathname.
  const segments = usePathDetailSegments(`/apps/${appSlug}/features`)
  const selectedId = segments[0] ?? null

  if (selectedId) {
    return (
      <ListPane>
        <ListPaneBody>
          {data.length === 0 ? (
            <ListPaneEmpty>No features match this view</ListPaneEmpty>
          ) : (
            data.map((feature) => (
              <ListPaneItem
                key={feature.id}
                href={`/apps/${appSlug}/features/${feature.id}`}
                selected={feature.id === selectedId}
                label={`View feature ${feature.name}`}
                title={feature.name}
                subtitle={`${feature.slug} · ${feature.enabled ? 'On' : 'Off'}`}
              />
            ))
          )}
        </ListPaneBody>
      </ListPane>
    )
  }

  return (
    <AppFeaturesTable
      appSlug={appSlug}
      data={data}
      query={query}
      moduleFeatureIds={moduleFeatureIds}
      hasMore={hasMore}
      firstId={firstId}
      lastId={lastId}
      toolbarAction={toolbarAction}
      emptyState={emptyState}
    />
  )
}
