'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { isUserStatus } from '@/lib/status'
import { UsersToolbar } from './users-toolbar'

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/users` prefix so the sidebar stays on Users, but the
 * toolbar and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function UsersSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const statusParam = useSearchParams().get('status')
  const status =
    statusParam === 'all' || !isUserStatus(statusParam) ? 'all' : statusParam

  return (
    <ListDetailSection
      toolbar={<UsersToolbar status={status} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
