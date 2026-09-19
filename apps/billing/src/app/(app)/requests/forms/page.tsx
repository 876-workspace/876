import {
  RequestFormsList,
  RequestFormsListSkeleton,
  type RequestFormRow,
} from '@876/crm-ui/request-forms-list'
import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Suspense } from 'react'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/clients/crm'

export const metadata = { title: 'Request forms' }

export default function RequestFormsPage() {
  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <ResourceToolbar title="Forms" refresh />
      <Suspense fallback={<RequestFormsListSkeleton />}>
        <RequestFormsData />
      </Suspense>
    </Page>
  )
}

async function RequestFormsData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const result = await getCrm().requestForms.list(context.orgId)
  const missingWorkspace = result.error?.code === 'crm/tenant-not-found'
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
      {result.error && !missingWorkspace ? (
        <AppError
          title="Request forms could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <RequestFormsList forms={forms} />
    </div>
  )
}
