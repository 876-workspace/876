import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { PrioritiesList } from './_components/priorities-list'

export const metadata = { title: 'Priorities - Settings' }

export default async function PrioritiesPage() {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestPriorities.list(context.orgId)

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Priorities"
        primaryLabel="Add"
        primaryHref="/settings/priorities/new"
        primaryVariant="info"
        refresh
      />
      {result.error ? (
        <AppError
          title="Priorities couldn't be loaded"
          error={result.error}
          variant="page"
        />
      ) : (
        <PrioritiesList priorities={result.data.data} />
      )}
    </Page>
  )
}
