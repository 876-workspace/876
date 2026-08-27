import { notFound } from 'next/navigation'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import {
  RequestForm,
  type RequestFormValues,
} from '../../_components/request-form'

type Props = { params: Promise<{ requestId: string }> }

export default async function EditRequestPage({ params }: Props) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const { requestId } = await params
  const [
    requestResult,
    customersResult,
    departmentsResult,
    membersResult,
    categoriesResult,
  ] = await Promise.all([
    $876.requests.retrieve(context.orgId, requestId),
    $876.customerProfiles.list(context.orgId),
    $876.departments.list(context.orgId),
    $876.organizationMembers.list(context.orgId),
    $876.requestCategories.list(context.orgId),
  ])
  if (requestResult.error?.code === 'crm/request-not-found') notFound()
  if (requestResult.error) throw new Error(requestResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

  const request = requestResult.data
  const departments =
    departmentsResult.data?.data.map((d) => ({ id: d.id, name: d.name })) ?? []

  const members =
    membersResult.data?.data.map((m) => {
      const nameParts = [m.first_name, m.last_name].filter(Boolean)
      const name =
        nameParts.length > 0 ? nameParts.join(' ') : (m.email ?? m.user_id)
      return {
        userId: m.user_id,
        name,
        email: m.email,
      }
    }) ?? []

  // `description` is absent on an existing request — the opening message lives
  // in the note thread, and the form hides the field when editing.
  const initial: RequestFormValues = {
    customerId: request.customerId,
    description: '',
    subject: request.subject,
    categoryId: request.categoryId ?? '',
    status: request.status,
    priority: request.priority,
    source: request.source,
    teamId: request.teamId ?? '',
    assigneeId: request.assigneeId ?? '',
  }

  return (
    <Page>
      <PageBreadcrumb
        href={`/requests/${request.id}`}
        label={`Request #${request.number}`}
        className="mb-4"
      />
      <h1 className="876-page-title mb-6">Edit request</h1>
      <RequestForm
        customers={customersResult.data.data}
        categories={categoriesResult.data?.data ?? []}
        departments={departments}
        members={members}
        requestId={request.id}
        initial={initial}
      />
    </Page>
  )
}
