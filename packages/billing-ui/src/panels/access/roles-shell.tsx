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

export const ROLE_TYPE_PARAM = 'type'
export const ROLE_TYPE_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Roles' },
  { value: 'system', label: 'System', headingLabel: 'System Roles' },
  { value: 'custom', label: 'Custom', headingLabel: 'Custom Roles' },
]

type Props = {
  title: string
  newHref: string
  canCreate: boolean
  list: ReactNode
  children: ReactNode
}

/** Persistent list/detail frame for a host's finance role settings. */
export function RolesShell({
  title,
  newHref,
  canCreate,
  list,
  children,
}: Props) {
  const { open } = useListDetailRoute()
  const searchParams = useSearchParams()
  const type = searchParams.get(ROLE_TYPE_PARAM) ?? 'all'

  return (
    <Page className={open ? 'h-full min-h-0 p-0' : 'min-h-full'}>
      <ListDetailShell
        open={open}
        toolbar={
          <ResourceToolbar
            title={title}
            titleFilter={
              <StatusFilterHeading
                label={title}
                value={type}
                options={ROLE_TYPE_OPTIONS}
                paramKey={ROLE_TYPE_PARAM}
              />
            }
            primaryLabel={!open ? 'Add' : undefined}
            primaryHref={!open ? newHref : undefined}
            primaryDisabled={!canCreate}
            primaryVariant="info"
            refresh
          />
        }
        list={list}
        detail={children}
        bleed
      />
    </Page>
  )
}
