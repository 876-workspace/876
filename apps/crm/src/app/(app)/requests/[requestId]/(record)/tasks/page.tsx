import { RequestTasksSection } from '../../../_components/request-tasks'
import { loadDirectory, loadRequest, loadTasks } from '../../_data'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestTasksPage({ params }: Props) {
  const { requestId } = await params
  const [{ request }, tasks, { members }] = await Promise.all([
    loadRequest(requestId),
    loadTasks(requestId),
    loadDirectory(),
  ])

  return (
    <RequestTasksSection
      requestId={request.id}
      tasks={tasks}
      members={members}
    />
  )
}
