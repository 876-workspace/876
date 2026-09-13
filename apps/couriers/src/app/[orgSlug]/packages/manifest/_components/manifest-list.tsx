'use client'

import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { QueueListIcon } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import {
  MANIFEST_STATUS_OPTIONS,
  resolveManifestStatusFilter,
} from '../_lib/manifest-list-config'
import {
  ManifestTable,
  manifestStatusVariant,
  type ManifestTableRow,
} from './manifest-table'

type Props = {
  manifests: ManifestTableRow[]
  orgSlug: string
}

/**
 * The list column: the full table while no manifest is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 */
export function ManifestList({ manifests, orgSlug }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // There is no manifest retrieve yet, so the status filter narrows the rows
  // here. It is applied in this component rather than the query because the
  // list lives in the layout, which receives no `searchParams`.
  const status = resolveManifestStatusFilter(searchParams.get('status'))
  const rows =
    status === 'all'
      ? manifests
      : manifests.filter((row) => row.status === status)

  const selectedLabel = MANIFEST_STATUS_OPTIONS.find(
    (option) => option.value === status
  )?.label
  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <QueueListIcon />
        </EmptyMedia>
        <EmptyTitle>No manifests</EmptyTitle>
        <EmptyDescription>
          {status === 'all'
            ? 'No manifests yet.'
            : `No ${selectedLabel?.toLowerCase() ?? status} manifests.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  if (segments.length === 0)
    return (
      <ManifestTable
        manifests={rows}
        orgSlug={orgSlug}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/packages/manifest`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No manifests</ListPaneEmpty>
        ) : (
          rows.map((manifest) => (
            <ListPaneItem
              key={manifest.id}
              href={
                query
                  ? `${baseHref}/${manifest.id}?${query}`
                  : `${baseHref}/${manifest.id}`
              }
              selected={manifest.id === selectedId}
              label={`View manifest ${manifest.reference}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {manifest.reference}
                </span>
              }
              subtitle={`${manifest.packages} packages`}
              trailing={
                <Badge variant={manifestStatusVariant(manifest.status)}>
                  {manifest.status}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
