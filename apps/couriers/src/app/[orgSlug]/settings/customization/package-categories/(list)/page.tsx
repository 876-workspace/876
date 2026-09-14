import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PackageCategoriesData } from '../_components/package-categories-data'
import {
  PackageCategoriesShell,
  resolvePackageCategoryStatusFilter,
} from '../_components/package-categories-shell'
import { PACKAGE_CATEGORIES_SKELETON_COLUMNS } from '../_components/package-categories-skeleton-columns'

export const metadata = { title: 'Package categories' }

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PackageCategoriesSettingsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const filter = resolvePackageCategoryStatusFilter(status ?? null)

  return (
    <Page>
      <PackageCategoriesShell orgSlug={orgSlug} status={filter} />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PACKAGE_CATEGORIES_SKELETON_COLUMNS} />
        }
      >
        <PackageCategoriesData orgSlug={orgSlug} status={filter} />
      </Suspense>
    </Page>
  )
}
