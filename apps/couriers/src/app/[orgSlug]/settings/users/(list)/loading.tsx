'use client'

import { useParams } from 'next/navigation'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { UsersToolbar } from '../_components/users-toolbar'
import { USERS_SKELETON_COLUMNS } from '../_components/users-skeleton-columns'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      {/* Roles are only needed once the invite dialog opens, which cannot
          happen from a loading fallback — an empty list keeps the real toolbar
          on screen without fetching anything. */}
      <UsersToolbar orgSlug={orgSlug} roles={[]} status="all" />
      <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
    </Page>
  )
}
