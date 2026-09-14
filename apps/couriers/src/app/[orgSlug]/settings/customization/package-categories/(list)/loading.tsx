'use client'

import { useParams } from 'next/navigation'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PackageCategoriesShell } from '../_components/package-categories-shell'
import { PACKAGE_CATEGORIES_SKELETON_COLUMNS } from '../_components/package-categories-skeleton-columns'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <PackageCategoriesShell orgSlug={orgSlug} status="all" />
      <DataTableSkeleton columns={PACKAGE_CATEGORIES_SKELETON_COLUMNS} />
    </Page>
  )
}
