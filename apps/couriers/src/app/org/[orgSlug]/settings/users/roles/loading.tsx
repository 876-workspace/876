'use client'

import { useParams } from 'next/navigation'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { RolesShell } from './_components/roles-shell'
import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <RolesShell orgSlug={orgSlug} />
      <DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />
    </Page>
  )
}
