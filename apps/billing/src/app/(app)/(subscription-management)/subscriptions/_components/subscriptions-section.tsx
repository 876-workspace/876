'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const SUBSCRIPTION_STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Subscriptions',
    headingLabel: 'All Subscriptions',
  },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Subscriptions' },
  {
    value: 'trialing',
    label: 'Trialing',
    headingLabel: 'Trialing Subscriptions',
  },
  { value: 'active', label: 'Active', headingLabel: 'Active Subscriptions' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Subscriptions' },
  {
    value: 'canceled',
    label: 'Canceled',
    headingLabel: 'Canceled Subscriptions',
  },
  { value: 'ended', label: 'Ended', headingLabel: 'Ended Subscriptions' },
]

const TAKEOVER_SEGMENTS = [
  'new',
  'edit',
  'invoice-preferences',
  'views',
  'charges',
  'discounts',
] as const

export function SubscriptionsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status')
  const validStatuses = [
    'draft',
    'trialing',
    'active',
    'paused',
    'canceled',
    'ended',
  ]
  const selectedStatus = validStatuses.includes(status ?? '') ? status! : 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Subscriptions"
          status={selectedStatus}
          options={SUBSCRIPTION_STATUS_OPTIONS}
          primary={{
            href: '/subscriptions/new',
            permission: 'subscriptions:write',
          }}
        />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
