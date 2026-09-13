import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import {
  requireAppPermission,
  requireCrmContext,
} from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'

import {
  FormsList,
  FormsListSkeleton,
  type RequestFormRow,
} from './_components/forms-list'

export const metadata = { title: 'Forms' }

export default async function FormsPage() {
  await requireAppPermission('request-forms.view')

  return (
    <Page>
      <ResourceToolbar
        title="Forms"
        titleFilter={
          <StatusFilterHeading
            label="Forms"
            value="all"
            options={[{ value: 'all', label: 'All Forms' }]}
          />
        }
        primaryLabel="Add"
        primaryHref="/forms/new"
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<FormsListSkeleton />}>
        <FormsListData />
      </Suspense>
    </Page>
  )
}

async function FormsListData() {
  const context = await requireCrmContext()
  const result = await crm.requestForms.list(context.orgId)
  const forms: RequestFormRow[] =
    result.data?.data.map((form) => ({
      id: form.id,
      name: form.name,
      slug: form.slug,
      status: form.status,
      version: form.version,
      fieldCount: form.definition.fields.length,
      updatedAt: form.updatedAt,
    })) ?? []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some form data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <FormsList forms={forms} />
    </div>
  )
}
