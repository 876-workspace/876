'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

export const USER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function UsersShell({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const { open } = useListDetailRoute()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'

  return (
    <Page className="h-full min-h-0">
      <ListDetailShell
        open={open}
        toolbar={
          <ResourceToolbar
            title="Users"
            titleFilter={
              <StatusFilterHeading
                label="Users"
                value={status}
                options={USER_STATUS_OPTIONS}
              />
            }
            refresh
          />
        }
        list={list}
        detail={children}
      />
    </Page>
  )
}
