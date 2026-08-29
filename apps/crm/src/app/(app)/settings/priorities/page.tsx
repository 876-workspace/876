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
  const priorities = result.data?.data ?? []

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
      <div className="space-y-3">
        {result.error ? (
          <AppError
            title="Some priority data could not be loaded"
            error={result.error}
            variant="banner"
          />
        ) : null}
        <PrioritiesList priorities={priorities} />
      </div>
    </Page>
  )
}
