'use client'

import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { usePathDetailSegments } from '@876/ui/list-detail-shell'

import { formatDate } from '@/lib/format'
import { SubscribersTable } from './subscribers-table'

type PriceOption = { id: string; label: string }

/**
 * The list column in both of its forms: the full-width table when no
 * subscription is open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width.
 */
export function SubscribersList({
  data,
  orgMap,
  prices,
  appSlug,
}: {
  data: AdminSubscription[]
  orgMap: Record<string, AdminOrganization>
  prices: PriceOption[]
  appSlug: string
}) {
  // Rendered inside the `@list` slot, where layout segments describe the slot
  // rather than the open record, so selection comes from the pathname.
  const segments = usePathDetailSegments(`/apps/${appSlug}/subscribers`)
  const selectedId = segments[0] ?? null

  if (selectedId) {
    return (
      <ListPane>
        <ListPaneBody>
          {data.length === 0 ? (
            <ListPaneEmpty>No subscribers match this view</ListPaneEmpty>
          ) : (
            data.map((subscription) => {
              const org = orgMap[subscription.organization_id]
              const name =
                org?.doing_business_as ??
                org?.name ??
                subscription.organization_id
              const started = subscription.start_date
                ? formatDate(subscription.start_date)
                : 'start date unknown'

              return (
                <ListPaneItem
                  key={subscription.id}
                  href={`/apps/${appSlug}/subscribers/${subscription.id}`}
                  selected={subscription.id === selectedId}
                  label={`View subscription for ${name}`}
                  title={name}
                  subtitle={`${subscription.status.replaceAll('_', ' ')} · ${started}`}
                />
              )
            })
          )}
        </ListPaneBody>
      </ListPane>
    )
  }

  return (
    <SubscribersTable
      data={data}
      orgMap={orgMap}
      prices={prices}
      appSlug={appSlug}
    />
  )
}
