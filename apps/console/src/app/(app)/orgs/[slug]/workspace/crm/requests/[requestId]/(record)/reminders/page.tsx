import { notFound } from 'next/navigation'

import { RequestRemindersSection } from '@/features/crm/components/request-reminders'
import {
  loadOrgDirectory,
  loadOrgReminders,
  loadOrgRequest,
} from '@/features/crm/request-data'
import { resolveOrg } from '../../../../../../_data'

export const metadata = { title: 'Reminders' }

type Props = { params: Promise<{ slug: string; requestId: string }> }

export default async function OrgRequestRemindersPage({ params }: Props) {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [{ session, request }, reminders, { members }] = await Promise.all([
    loadOrgRequest(
      org.id,
      requestId,
      `/orgs/${slug}/workspace/crm/requests/${requestId}/reminders`
    ),
    loadOrgReminders(org.id, requestId),
    loadOrgDirectory(org.id),
  ])

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
