import { Suspense } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import {
  requireAppPermission,
  requireCrmContext,
} from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/clients/crm'

import { CATEGORIES_SKELETON_COLUMNS } from './_components/categories-skeleton-columns'
import { CategorySplit } from './_components/category-split'
import { CategorySplitSkeleton } from './_components/category-split-skeleton'

export const metadata = { title: 'Categories - Settings' }
const CATEGORY_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]
function isCategoryStatus(
  value: string | undefined
): value is 'active' | 'archived' {
  return value === 'active' || value === 'archived'
}
type Props = { searchParams: Promise<{ status?: string; category?: string }> }

export default async function CategoriesPage({ searchParams }: Props) {
  await requireAppPermission('categories.view')

  const { status, category } = await searchParams
  const selectedStatus = isCategoryStatus(status) ? status : 'all'
  const selectedCategoryId = category
  return (
    <Page>
      <ResourceToolbar
        title="Categories"
        titleFilter={
          <StatusFilterHeading
            label="Categories"
            value={selectedStatus}
            options={CATEGORY_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={
          selectedStatus !== 'all'
            ? `/settings/categories?status=${selectedStatus}&category=new`
            : '/settings/categories?category=new'
        }
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          selectedCategoryId ? (
            <CategorySplitSkeleton />
          ) : (
            <DataTableSkeleton columns={CATEGORIES_SKELETON_COLUMNS} />
          )
        }
      >
        <CategoriesTableData
          status={selectedStatus}
          selectedCategoryId={selectedCategoryId}
        />
      </Suspense>
    </Page>
  )
}

async function CategoriesTableData({
  status,
  selectedCategoryId,
}: {
  status: 'all' | 'active' | 'archived'
  selectedCategoryId?: string
}) {
  const context = await requireCrmContext()
  const [categoriesResult, teamsResult, prioritiesResult] = await Promise.all([
    crm.requestCategories.list(context.orgId),
    crm.teams.list(context.orgId),
    crm.requestPriorities.list(context.orgId),
  ])
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  const teamNames = Object.fromEntries(
    (teamsResult.data?.data ?? []).map((team) => [team.id, team.name])
  )
  const allCategories = categoriesResult.data?.data ?? []
  const filteredCategories =
    status === 'active'
      ? allCategories.filter((c) => c.isActive)
      : status === 'archived'
        ? allCategories.filter((c) => !c.isActive)
        : allCategories
  return (
    <CategorySplit
      categories={filteredCategories}
      priorities={prioritiesResult.data?.data ?? []}
      teamNames={teamNames}
      selectedId={selectedCategoryId}
    />
  )
}
