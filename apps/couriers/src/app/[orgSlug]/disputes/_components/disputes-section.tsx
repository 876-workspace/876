'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

export function DisputesSection({
  orgSlug,
  list,
  children,
}: {
  orgSlug: string
  list: ReactNode
  children: ReactNode
}) {
  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Disputes"
          titleFilter={
            <StatusFilterHeading
              label="Disputes"
              value="all"
              options={[{ value: 'all', label: 'All Disputes' }]}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/disputes/new`}
          primaryVariant="info"
          refresh
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
