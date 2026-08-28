import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Suspense } from 'react'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import {
  FormsList,
  FormsListSkeleton,
  type RequestFormRow,
} from './_components/forms-list'

export const metadata = { title: 'Forms' }

/**
 * The intake forms an organization publishes for customers to raise requests
 * through. The toolbar is static chrome and renders before the list resolves.
 */
export default function FormsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Forms"
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
  const $876 = await get876Client()

  const result = await $876.requestForms.list(context.orgId)
  if (result.error) throw new Error(result.error.message)

  const forms: RequestFormRow[] = result.data.data.map((form) => ({
    id: form.id,
    name: form.name,
    slug: form.slug,
    status: form.status,
    version: form.version,
    fieldCount: form.definition.fields.length,
    updatedAt: form.updatedAt,
  }))

  return <FormsList forms={forms} />
}
