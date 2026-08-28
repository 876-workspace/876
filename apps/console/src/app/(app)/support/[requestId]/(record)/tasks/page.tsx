import { notFound } from 'next/navigation'

import { PlatformOrganizationUnavailable } from '@/features/support/components/platform-organization-unavailable'
import { RequestTasksSection } from '@/features/support/components/request-tasks'
import {
  loadDirectory,
  loadRequest,
  loadTasks,
} from '@/features/support/request-data'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ requestId: string }> }

export default async function SupportRequestTasksPage({ params }: Props) {
  const { requestId } = await params
  const [{ org, session, request }, tasks, { members }] = await Promise.all([
    loadRequest(requestId),
    loadTasks(requestId),
    loadDirectory(),
  ])

  if (!org) return <PlatformOrganizationUnavailable />
  if (!request) notFound()

  return (
    <RequestTasksSection
      organizationId={org.id}
      requestId={request.id}
      tasks={tasks}
      members={members}
      currentUserId={session.id}
    />
  )
}
