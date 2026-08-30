import { AppError } from '@876/ui/app-error'

import { RequestEventsSection } from '../../../_components/request-events'
import { loadEvents, loadRequest } from '../../_data'

export const metadata = { title: 'Schedule' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestSchedulePage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, eventsResult] = await Promise.all([
    loadRequest(requestId),
    loadEvents(requestId),
  ])

  if (!requestResult.request)
    return requestResult.error ? (
      <AppError
        title="Request data is temporarily unavailable"
        error={requestResult.error}
        variant="banner"
      />
    ) : null

  return (
    <div className="space-y-3">
      {eventsResult.error ? (
        <AppError
          title="Some scheduled events could not be loaded"
          error={eventsResult.error}
          variant="banner"
        />
      ) : null}
      <RequestEventsSection
        requestId={requestResult.request.id}
        events={eventsResult.events}
      />
    </div>
  )
}
