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
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function UsersShell({
  list,
  children,
  canInvite = false,
}: {
  list: ReactNode
  children: ReactNode
  /** Gated on `apps:assign`; the invite route enforces it again. */
  canInvite?: boolean
}) {
  const { open } = useListDetailRoute()
  const status = useSearchParams().get('status') ?? 'all'
  return (
    <Page className={open ? 'h-full min-h-0 p-0' : 'min-h-full p-0'}>
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
            primaryLabel={canInvite ? 'Add' : undefined}
            primaryHref={canInvite ? '/settings/users/invite' : undefined}
            primaryVariant="info"
            refresh
            dropdownActions={[
              { label: 'Import', icon: 'import', disabled: true },
              { label: 'Export', icon: 'export', disabled: true },
            ]}
          />
        }
        list={list}
        detail={children}
        bleed
      />
    </Page>
  )
}
