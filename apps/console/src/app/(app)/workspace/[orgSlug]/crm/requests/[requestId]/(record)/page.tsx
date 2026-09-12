import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import {
  RequestNotesSection,
  type NoteAuthor,
} from '@/features/crm/components/request-notes'
import {
  loadOrgDirectory,
  loadOrgNotes,
  loadOrgRequest,
} from '@/features/crm/request-data'
import { resolveOrgResult } from '@/features/orgs/org-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'

type Props = { params: Promise<{ orgSlug: string; requestId: string }> }

export const metadata = { title: 'Request' }

export default async function OrgRequestConversationPage({ params }: Props) {
  const { orgSlug, requestId } = await params
  const orgResult = await resolveOrgResult(orgSlug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const [requestResult, notesResult, directory] = await Promise.all([
    loadOrgRequest(
      orgResult.data.id,
      requestId,
      `${workspaceBase(orgSlug, 'crm')}/requests/${requestId}`
    ),
    loadOrgNotes(orgResult.data.id, requestId),
    loadOrgDirectory(orgResult.data.id),
  ])

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
        organizationId={orgResult.data.id}
        requestId={requestResult.request.id}
        notes={notesResult.notes}
        currentUserId={requestResult.session.id}
        canCreatePrivateNote
        authors={authors}
      />
    </div>
  )
}
