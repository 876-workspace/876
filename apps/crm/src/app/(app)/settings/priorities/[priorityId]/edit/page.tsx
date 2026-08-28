import { notFound } from 'next/navigation'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { PriorityForm } from '../../_components/priority-form'

type Props = { params: Promise<{ priorityId: string }> }

export const metadata = { title: 'Edit priority - Settings' }

export default async function EditPriorityPage({ params }: Props) {
  const { priorityId } = await params
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestPriorities.retrieve(context.orgId, priorityId)
  if (result.error?.code === 'crm/priority-not-found' || !result.data) notFound()
  if (result.error) throw new Error(result.error.message)

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/priorities"
        label="Priorities"
        className="mb-4"
      />
      <h1 className="876-page-title mb-6">Edit priority</h1>
      <PriorityForm priority={result.data} />
    </Page>
  )
}
