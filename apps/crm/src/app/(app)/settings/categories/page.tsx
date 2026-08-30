import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
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

  const teamNames = Object.fromEntries(
    (teamsResult.data?.data ?? []).map((team) => [team.id, team.name])
  )

  return (
    <div className="space-y-3">
      {categoriesResult.error ? (
        <AppError
          title="Some category data could not be loaded"
          error={categoriesResult.error}
          variant="banner"
        />
      ) : null}
      {prioritiesResult.error ? (
        <AppError
          title="Priority options are temporarily incomplete"
          error={prioritiesResult.error}
          variant="inline"
        />
      ) : null}
      {teamsResult.error ? (
        <AppError
          title="Team information is temporarily incomplete"
          error={teamsResult.error}
          variant="inline"
        />
      ) : null}
      <CategoriesList
        categories={categoriesResult.data?.data ?? []}
        priorities={prioritiesResult.data?.data ?? []}
        teamNames={teamNames}
        createOpen={createOpen}
      />
    </div>
  )
}
