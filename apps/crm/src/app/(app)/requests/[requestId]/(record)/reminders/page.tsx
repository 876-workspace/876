import { AppError } from '@876/ui/app-error'

import { RequestRemindersSection } from '../../../_components/request-reminders'
import { loadDirectory, loadReminders, loadRequest } from '../../_data'

export const metadata = { title: 'Reminders' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestRemindersPage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, remindersResult, directory] = await Promise.all([
    loadRequest(requestId),
    loadReminders(requestId),
    loadDirectory(),
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
      {remindersResult.error ? (
        <AppError
          title="Some reminder data could not be loaded"
          error={remindersResult.error}
          variant="banner"
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Member details are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
        />
      ) : null}
      <RequestRemindersSection
        requestId={requestResult.request.id}
        reminders={remindersResult.reminders}
        currentUserId={requestResult.context.userId}
        members={directory.members}
      />
    </div>
  )
}
