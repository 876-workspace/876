import { AppError } from '@876/ui/app-error'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import {
  RequestNotesSection,
  type NoteAuthor,
} from '@/features/crm/components/request-notes'
import {
  loadDirectory,
  loadNotes,
  loadRequest,
} from '@/features/crm/request-data'

type Props = { params: Promise<{ requestId: string }> }

export const metadata = { title: 'Request' }

export default async function RequestConversationPage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, notesResult, directory] = await Promise.all([
    loadRequest(requestId),
    loadNotes(requestId),
    loadDirectory(),
  ])

  if (!requestResult.org) return <PlatformOrganizationUnavailable />
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

  const authors: Record<string, NoteAuthor> = Object.fromEntries(
    directory.members.map((member) => [
      member.userId,
      { name: member.name, avatar: member.avatar },
    ])
  )

  return (
    <div className="space-y-3">
      {notesResult.error ? (
        <AppError
          title="Some conversation data could not be loaded"
          error={notesResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Author details are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
          showCode
        />
      ) : null}
      <RequestNotesSection
        organizationId={requestResult.org.id}
        requestId={requestResult.request.id}
        notes={notesResult.notes}
        currentUserId={requestResult.session.id}
        canCreatePrivateNote
        authors={authors}
      />
    </div>
  )
}
