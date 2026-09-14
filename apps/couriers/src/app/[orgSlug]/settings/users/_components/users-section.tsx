'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { UsersToolbar } from './users-toolbar'

type Props = {
  orgSlug: string
  roles: Array<{ id: string; name: string }>
  /** The member list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The member card: whatever route is active under `/settings/users`. */
  children: ReactNode
}

/** The persistent frame for every `/settings/users` member route. */
export function UsersSection({ orgSlug, roles, list, children }: Props) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const rawStatus = useSearchParams().get('status')
  const status =
    rawStatus === 'active' || rawStatus === 'inactive' ? rawStatus : 'all'

  return (
    <ListDetailSection
      toolbar={<UsersToolbar orgSlug={orgSlug} roles={roles} status={status} />}
      list={list}
      className="h-full min-h-0"
    >
      {children}
    </ListDetailSection>
  )
}
