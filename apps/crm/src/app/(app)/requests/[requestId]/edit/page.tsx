import { notFound } from 'next/navigation'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import {
  RequestForm,
  type RequestFormValues,
} from '../../_components/request-form'

type Props = { params: Promise<{ requestId: string }> }

export default async function EditRequestPage({ params }: Props) {
  const context = await requireCrmContext()
  const { requestId } = await params
  const [requestResult, customersResult] = await Promise.all([
    $876.requests.retrieve(context.orgId, requestId),
    $876.customerProfiles.list(context.orgId),
  ])
  if (requestResult.error?.code === 'crm/request-not-found') notFound()
  if (requestResult.error) throw new Error(requestResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

  const request = requestResult.data
  // `description` is absent on an existing request — the opening message lives
  // in the note thread, and the form hides the field when editing.
  const initial: RequestFormValues = {
    customerId: request.customerId,
    description: '',
    subject: request.subject,
    category: request.category,
    status: request.status,
    priority: request.priority,
    source: request.source,
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
        requestId={request.id}
        initial={initial}
      />
    </Page>
  )
}
