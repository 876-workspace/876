'use client'

import { useDetailSegments } from '@876/ui/list-detail-shell'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import { DisputesTable, type DisputeTableRow } from './disputes-table'

type Props = {
  disputes: DisputeTableRow[]
  orgSlug: string
}

/**
 * The list column: the full table while no dispute is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 */
export function DisputesList({ disputes, orgSlug }: Props) {
  const segments = useDetailSegments()
  const query = useSearchParams().toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  if (segments.length === 0)
    return <DisputesTable disputes={disputes} orgSlug={orgSlug} />

  const baseHref = `/${orgSlug}/disputes`

  return (
    <ListPane>
      <ListPaneBody>
        {disputes.length === 0 ? (
          <ListPaneEmpty>No disputes</ListPaneEmpty>
        ) : (
          disputes.map((dispute) => (
            <ListPaneItem
              key={dispute.id}
              href={
                query
                  ? `${baseHref}/${dispute.id}?${query}`
                  : `${baseHref}/${dispute.id}`
              }
              selected={dispute.id === selectedId}
              label={`View dispute ${dispute.disputeNumber}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {dispute.disputeNumber}
                </span>
              }
              subtitle={dispute.customer}
              trailing={<Badge variant="secondary">{dispute.status}</Badge>}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
