'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { useListDetailRoute } from '@876/ui/list-detail-shell'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const BANKING_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Bank Accounts' },
  { value: 'active', label: 'Active', headingLabel: 'Active Bank Accounts' },
  {
    value: 'archived',
    label: 'Archived',
    headingLabel: 'Archived Bank Accounts',
  },
]

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/banking` prefix so the sidebar stays on Banking, but the
 * toolbar and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'edit', 'transactions'] as const

export function BankingSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const { open } = useListDetailRoute(TAKEOVER_SEGMENTS)
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Banking"
          status={status}
          options={BANKING_STATUS_OPTIONS}
          primary={
            open
              ? undefined
              : {
                  label: 'New',
                  href: '/banking/new',
                  permission: 'banking:write',
                }
          }
        />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
