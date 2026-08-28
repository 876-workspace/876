import { Suspense } from 'react'

import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { CategoriesList } from './_components/categories-list'
import { CategoriesSkeleton } from './_components/categories-skeleton'

export const metadata = { title: 'Categories - Settings' }

type Props = { searchParams: Promise<{ dialog?: string }> }

export default async function CategoriesPage({ searchParams }: Props) {
  const { dialog } = await searchParams

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Categories"
        primaryLabel="Add"
        primaryHref="/settings/categories?dialog=new"
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesData createOpen={dialog === 'new'} />
      </Suspense>
    </Page>
  )
}

async function CategoriesData({ createOpen }: { createOpen: boolean }) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const [categoriesResult, teamsResult, prioritiesResult] = await Promise.all([
    $876.requestCategories.list(context.orgId),
    $876.teams.list(context.orgId),
    $876.requestPriorities.list(context.orgId),
  ])
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (prioritiesResult.error) throw new Error(prioritiesResult.error.message)

  const teamNames = Object.fromEntries(
    (teamsResult.data?.data ?? []).map((team) => [team.id, team.name])
  )

  return (
    <CategoriesList
      categories={categoriesResult.data.data}
      priorities={prioritiesResult.data.data}
      teamNames={teamNames}
      createOpen={createOpen}
    />
  )
}
