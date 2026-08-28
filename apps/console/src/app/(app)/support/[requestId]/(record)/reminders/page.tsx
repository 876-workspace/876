import { notFound } from 'next/navigation'

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
  const [{ org, session, request }, reminders, { members }] = await Promise.all(
    [loadRequest(requestId), loadReminders(requestId), loadDirectory()]
  )

  if (!org) return <PlatformOrganizationUnavailable />
  if (!request) notFound()

  return (
    <RequestRemindersSection
      organizationId={org.id}
      requestId={request.id}
      reminders={reminders}
      currentUserId={session.id}
      members={members}
    />
  )
}
