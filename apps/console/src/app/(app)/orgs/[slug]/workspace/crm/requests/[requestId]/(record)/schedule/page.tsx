import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { RequestEventsSection } from '@/features/crm/components/request-events'
import { loadOrgEvents, loadOrgRequest } from '@/features/crm/request-data'
import { resolveOrgResult } from '../../../../../../_data'

export const metadata = { title: 'Schedule' }

type Props = { params: Promise<{ slug: string; requestId: string }> }

export default async function OrgRequestSchedulePage({ params }: Props) {
  const { slug, requestId } = await params
  const orgResult = await resolveOrgResult(slug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const baseHref = `/orgs/${slug}/workspace/crm/requests/${requestId}/schedule`
  const [requestResult, eventsResult] = await Promise.all([
    loadOrgRequest(orgResult.data.id, requestId, baseHref),
    loadOrgEvents(orgResult.data.id, requestId),
  ])

  if (!requestResult.request)
    return requestResult.error ? (
      <AppError
        title="Request data is temporarily unavailable"
        error={requestResult.error}
        variant="banner"
        showCode
      />
    ) : null

  return (
    <div className="space-y-3">
      {eventsResult.error ? (
        <AppError
          title="Some scheduled events could not be loaded"
          error={eventsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <RequestEventsSection
        organizationId={orgResult.data.id}
        requestId={requestResult.request.id}
        events={eventsResult.events}
      />
    </div>
  )
}
