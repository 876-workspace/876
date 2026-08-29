import { getError } from '@876/core'
import { notFound } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
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
    prioritiesResult,
  ] = await Promise.all([
    $876.requests.retrieve(context.orgId, requestId),
    $876.customerProfiles.list(context.orgId),
    $876.departments.list(context.orgId),
    $876.organizationMembers.list(context.orgId),
    $876.requestCategories.list(context.orgId),
    $876.requestPriorities.list(context.orgId),
  ])

  if (requestResult.error?.code === 'crm/request-not-found') notFound()

  if (requestResult.error)
    return (
      <Page>
        <PageBreadcrumb href="/requests" label="Requests" className="mb-4" />
        <h1 className="876-page-title mb-4">Edit request</h1>
        <AppError
          title="Request details are temporarily unavailable"
          error={requestResult.error}
          variant="banner"
        />
      </Page>
    )

  const request = requestResult.data
  const customers = customersResult.data?.data
  const priorities = prioritiesResult.data?.data
  // A response that carried neither an error nor a payload is still a failure;
  // rendering the form without customers or priorities would offer an empty
  // required field rather than telling the user the options are unavailable.
  const blockingError =
    customersResult.error ??
    prioritiesResult.error ??
    (customers && priorities ? null : getError('crm/invalid-response'))
  const departments =
    departmentsResult.data?.data.map((d) => ({ id: d.id, name: d.name })) ?? []

  const members =
    membersResult.data?.data.map((m) => {
      const nameParts = [m.first_name, m.last_name].filter(Boolean)
      const name =
        nameParts.length > 0 ? nameParts.join(' ') : (m.email ?? m.user_id)
      return { userId: m.user_id, name, email: m.email }
    }) ?? []

  const initial: RequestFormValues = {
    customerId: request.customerId,
    description: '',
    subject: request.subject,
    categoryId: request.categoryId ?? '',
    status: request.status,
    priorityId: request.priorityId,
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
      <div className="space-y-3">
        {blockingError ? (
          <AppError
            title="Some required request data is temporarily unavailable"
            error={blockingError}
            variant="banner"
          />
        ) : null}
        {categoriesResult.error ? (
          <AppError
            title="Category options are temporarily unavailable"
            error={categoriesResult.error}
            variant="inline"
          />
        ) : null}
        {departmentsResult.error ? (
          <AppError
            title="Team options are temporarily unavailable"
            error={departmentsResult.error}
            variant="inline"
          />
        ) : null}
        {membersResult.error ? (
          <AppError
            title="Assignee options are temporarily unavailable"
            error={membersResult.error}
            variant="inline"
          />
        ) : null}
        {blockingError || !customers || !priorities ? null : (
          <RequestForm
            customers={customers}
            categories={categoriesResult.data?.data ?? []}
            priorities={priorities}
            departments={departments}
            members={members}
            requestId={request.id}
            initial={initial}
          />
        )}
      </div>
    </Page>
  )
}
