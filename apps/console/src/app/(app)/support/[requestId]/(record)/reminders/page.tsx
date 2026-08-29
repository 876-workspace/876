import { AppError } from '@876/ui/app-error'

import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
import { RequestRemindersSection } from '@/features/crm/components/request-reminders'
import {
  loadDirectory,
  loadReminders,
  loadRequest,
} from '@/features/crm/request-data'

export const metadata = { title: 'Reminders' }

type Props = { params: Promise<{ requestId: string }> }

export default async function SupportRequestRemindersPage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, remindersResult, directory] = await Promise.all([
    loadRequest(requestId),
    loadReminders(requestId),
    loadDirectory(),
  ])

  if (!requestResult.org) return <PlatformOrganizationUnavailable />
  if (!requestResult.request) {
    return requestResult.error ? (
      <AppError
        title="Request data is temporarily unavailable"
        error={requestResult.error}
        variant="banner"
        showCode
      />
    ) : null
  }

  return (
    <div className="space-y-3">
      {remindersResult.error ? (
        <AppError
          title="Some reminder data could not be loaded"
          error={remindersResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Member details are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
          showCode
        />
      ) : null}
      <RequestRemindersSection
        organizationId={requestResult.org.id}
        requestId={requestResult.request.id}
        reminders={remindersResult.reminders}
        currentUserId={requestResult.session.id}
        members={directory.members}
      />
    </div>
  )
}
