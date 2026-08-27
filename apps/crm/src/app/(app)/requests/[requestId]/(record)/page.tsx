import {
  RequestNotesSection,
  type NoteAuthor,
} from '../../_components/request-notes'
import { loadDirectory, loadNotes, loadRequest } from '../_data'

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestConversationPage({ params }: Props) {
  const { requestId } = await params
  const [{ context, request }, notes, { members }] = await Promise.all([
    loadRequest(requestId),
    loadNotes(requestId),
    loadDirectory(),
  ])

  // The thread only carries opaque author ids; resolving them here is what puts
  // a real name and a real picture on every note.
  const authors: Record<string, NoteAuthor> = Object.fromEntries(
    members.map((m) => [m.userId, { name: m.name, avatar: m.avatar }])
  )

  return (
    <RequestNotesSection
      requestId={request.id}
      notes={notes}
      currentUserId={context.userId}
      authors={authors}
    />
  )
}
