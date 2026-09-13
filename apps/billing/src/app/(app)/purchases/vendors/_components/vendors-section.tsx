'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const VENDOR_STATUS_OPTIONS = [
  { value: 'all', label: 'All Vendors', headingLabel: 'All Vendors' },
  { value: 'active', label: 'Active', headingLabel: 'Active Vendors' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Vendors' },
]

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function VendorsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Vendors"
          status={selectedStatus}
          options={VENDOR_STATUS_OPTIONS}
          primary={{
            href: '/purchases/vendors/new',
            permission: 'purchases:write',
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
