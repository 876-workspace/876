import { AppError } from '@876/ui/app-error'

import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
import { RequestEventsSection } from '@/features/crm/components/request-events'
import { loadEvents, loadRequest } from '@/features/crm/request-data'

export const metadata = { title: 'Schedule' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestSchedulePage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, eventsResult] = await Promise.all([
    loadRequest(requestId),
    loadEvents(requestId),
  ])

  if (!requestResult.org) return <PlatformOrganizationUnavailable />
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
        organizationId={requestResult.org.id}
        requestId={requestResult.request.id}
        events={eventsResult.events}
      />
    </div>
  )
}
