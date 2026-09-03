import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { RequestRemindersSection } from '@/features/crm/components/request-reminders'
import {
  loadOrgDirectory,
  loadOrgReminders,
  loadOrgRequest,
} from '@/features/crm/request-data'
import { resolveOrgResult } from '@/features/orgs/org-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'

export const metadata = { title: 'Reminders' }

type Props = { params: Promise<{ orgSlug: string; requestId: string }> }

export default async function OrgRequestRemindersPage({ params }: Props) {
  const { orgSlug, requestId } = await params
  const orgResult = await resolveOrgResult(orgSlug)
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

  const [requestResult, remindersResult, directory] = await Promise.all([
    loadOrgRequest(
      orgResult.data.id,
      requestId,
      `${workspaceBase(orgSlug, 'crm')}/requests/${requestId}/reminders`
    ),
    loadOrgReminders(orgResult.data.id, requestId),
    loadOrgDirectory(orgResult.data.id),
  ])

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
          title="Reminder data is temporarily unavailable"
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
      {remindersResult.error ? null : (
        <RequestRemindersSection
          organizationId={orgResult.data.id}
          requestId={requestResult.request.id}
          reminders={remindersResult.reminders}
          currentUserId={requestResult.session.id}
          members={directory.members}
        />
      )}
    </div>
  )
}
