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
import { FlagIcon } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import {
  PRE_ALERT_STATUS_OPTIONS,
  resolvePreAlertStatusFilter,
} from '../_lib/pre-alerts-list-config'
import {
  PreAlertsTable,
  preAlertStatusVariant,
  type PreAlertTableRow,
} from './pre-alerts-table'

type Props = {
  preAlerts: PreAlertTableRow[]
  orgSlug: string
}

/**
 * The list column: the full table while no pre-alert is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 */
export function PreAlertsList({ preAlerts, orgSlug }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // There is no pre-alerts retrieve yet, so the status filter narrows the rows
  // here. It is applied in this component rather than the query because the
  // list lives in the layout, which receives no `searchParams`.
  const status = resolvePreAlertStatusFilter(searchParams.get('status'))
  const rows =
    status === 'all'
      ? preAlerts
      : preAlerts.filter((row) => row.status === status)

  const selectedLabel = PRE_ALERT_STATUS_OPTIONS.find(
    (option) => option.value === status
  )?.label
  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FlagIcon />
        </EmptyMedia>
        <EmptyTitle>No pre-alerts</EmptyTitle>
        <EmptyDescription>
          {status === 'all'
            ? 'No pre-alerts yet.'
            : `No ${selectedLabel?.toLowerCase() ?? status} pre-alerts.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  if (segments.length === 0)
    return (
      <PreAlertsTable
        preAlerts={rows}
        orgSlug={orgSlug}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/packages/pre-alerts`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No pre-alerts</ListPaneEmpty>
        ) : (
          rows.map((preAlert) => (
            <ListPaneItem
              key={preAlert.id}
              href={
                query
                  ? `${baseHref}/${preAlert.id}?${query}`
                  : `${baseHref}/${preAlert.id}`
              }
              selected={preAlert.id === selectedId}
              label={`View pre-alert ${preAlert.reference}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {preAlert.reference}
                </span>
              }
              subtitle={preAlert.customer}
              trailing={
                <Badge variant={preAlertStatusVariant(preAlert.status)}>
                  {preAlert.status}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
