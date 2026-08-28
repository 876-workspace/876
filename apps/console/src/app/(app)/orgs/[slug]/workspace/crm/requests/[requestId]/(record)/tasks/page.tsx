import { notFound } from 'next/navigation'

import { RequestTasksSection } from '@/features/crm/components/request-tasks'
import {
  loadOrgDirectory,
  loadOrgPriorities,
  loadOrgRequest,
  loadOrgTasks,
} from '@/features/crm/request-data'
import { resolveOrg } from '../../../../../../_data'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ slug: string; requestId: string }> }

export default async function OrgRequestTasksPage({ params }: Props) {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [{ session, request }, tasks, priorities, { members }] =
    await Promise.all([
      loadOrgRequest(
        org.id,
        requestId,
        `/orgs/${slug}/workspace/crm/requests/${requestId}/tasks`
      ),
      loadOrgTasks(org.id, requestId),
      loadOrgPriorities(org.id),
      loadOrgDirectory(org.id),
    ])

  if (!request) notFound()

  return (
    <RequestTasksSection
      organizationId={org.id}
      requestId={request.id}
      tasks={tasks}
      priorities={priorities}
      members={members}
      currentUserId={session.id}
    />
  )
}
