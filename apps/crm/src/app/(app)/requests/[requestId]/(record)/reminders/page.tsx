import { RequestRemindersSection } from '../../../_components/request-reminders'
import { loadDirectory, loadReminders, loadRequest } from '../../_data'

export const metadata = { title: 'Reminders' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestRemindersPage({ params }: Props) {
  const { requestId } = await params
  const [{ context, request }, reminders, { members }] = await Promise.all([
    loadRequest(requestId),
    loadReminders(requestId),
    loadDirectory(),
  ])

  return (
    <RequestRemindersSection
      requestId={request.id}
      reminders={reminders}
      currentUserId={context.userId}
      members={members}
    />
  )
}
