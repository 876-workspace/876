import { notFound } from 'next/navigation'

import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
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

export default async function SupportRequestConversationPage({
  params,
}: Props) {
  const { requestId } = await params
  const [{ org, session, request }, notes, { members }] = await Promise.all([
    loadRequest(requestId),
    loadNotes(requestId),
    loadDirectory(),
  ])

  if (!org) return <PlatformOrganizationUnavailable />
  if (!request) notFound()

  const authors: Record<string, NoteAuthor> = Object.fromEntries(
    members.map((m) => [m.userId, { name: m.name, avatar: m.avatar }])
  )

  return (
    <RequestNotesSection
      organizationId={org.id}
      requestId={request.id}
      notes={notes}
      currentUserId={session.id}
      authors={authors}
    />
  )
}
