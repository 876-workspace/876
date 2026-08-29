import { AppError } from '@876/ui/app-error'
import { PageBreadcrumb } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/guards'
import { RequestCreateForm } from '@/features/crm/components/request-create-form'
import {
  loadOrgPriorities,
  loadOrgRequestCustomers,
} from '@/features/crm/request-data'
import { resolveOrgResult } from '../../../../_data'

type Props = { params: Promise<{ slug: string }> }

export default async function NewRequestPage({ params }: Props) {
  const { slug } = await params
  const [orgResult, session] = await Promise.all([
    resolveOrgResult(slug),
    requireSession(`/orgs/${slug}/workspace/crm/requests/new`),
  ])
  if (orgResult.error?.code === 'organization/not-found') notFound()

  const requestsHref = `/orgs/${slug}/workspace/crm/requests`
  if (orgResult.error)
    return (
      <div className="space-y-5">
        <PageBreadcrumb href={requestsHref} label="Requests" />
        <h1 className="876-page-title">New request</h1>
        <AppError
          title="Organization details are temporarily unavailable"
          error={orgResult.error}
          variant="banner"
          showCode
        />
      </div>
    )
  if (!orgResult.data) notFound()

  const [customersResult, prioritiesResult] = await Promise.all([
    loadOrgRequestCustomers(orgResult.data.id),
    loadOrgPriorities(orgResult.data.id),
  ])
  const blockingError = customersResult.error ?? prioritiesResult.error

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb href={requestsHref} label="Requests" className="mb-2" />
        <h1 className="876-page-title mt-2">New request</h1>
      </div>
      {blockingError ? (
        <AppError
          title="Some request form data is temporarily unavailable"
          error={blockingError}
          variant="banner"
          showCode
        />
      ) : (
        <RequestCreateForm
          organizationId={orgResult.data.id}
          requestsHref={requestsHref}
          currentUserId={session.id}
          customers={customersResult.customers}
          priorities={prioritiesResult.priorities}
        />
      )}
    </div>
  )
}
