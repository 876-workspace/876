import { AppError } from '@876/ui/app-error'

import { canCreatePrivateRequestNote } from '@/lib/auth/roles'

import {
  RequestNotesSection,
  type NoteAuthor,
} from '../../_components/request-notes'
import { loadDirectory, loadNotes, loadRequest } from '../_data'

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestConversationPage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, notesResult, directory] = await Promise.all([
    loadRequest(requestId),
    loadNotes(requestId),
    loadDirectory(),
  ])

  if (!requestResult.request)
    return requestResult.error ? (
      <AppError
        title="Request data is temporarily unavailable"
        error={requestResult.error}
        variant="banner"
      />
    ) : null

  const authors: Record<string, NoteAuthor> = Object.fromEntries(
    directory.members.map((m) => [
      m.userId,
      { name: m.name, avatar: m.avatar },
    ])
  )

  return (
    <div className="space-y-3">
      {notesResult.error ? (
        <AppError
          title="Some conversation data could not be loaded"
          error={notesResult.error}
          variant="banner"
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Author details are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
        />
      ) : null}
      <RequestNotesSection
        requestId={requestResult.request.id}
        notes={notesResult.notes}
        currentUserId={requestResult.context.userId}
        canCreatePrivateNote={canCreatePrivateRequestNote(
          requestResult.context.role
        )}
        authors={authors}
      />
    </div>
  )
}
