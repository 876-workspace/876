import { RequestTasksSection } from '../../../_components/request-tasks'
import { loadDirectory, loadPriorities, loadRequest, loadTasks } from '../../_data'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestTasksPage({ params }: Props) {
  const { requestId } = await params
  const [{ request }, tasks, priorities, { members }] = await Promise.all([
    loadRequest(requestId),
    loadTasks(requestId),
    loadPriorities(),
    loadDirectory(),
  ])

  return (
    <RequestTasksSection
      requestId={request.id}
      tasks={tasks}
      priorities={priorities}
      members={members}
    />
  )
}
