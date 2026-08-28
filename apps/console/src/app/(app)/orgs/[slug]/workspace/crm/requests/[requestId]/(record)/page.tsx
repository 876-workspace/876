import { notFound } from 'next/navigation'

import {
  RequestNotesSection,
  type NoteAuthor,
} from '@/features/crm/components/request-notes'
import {
  loadOrgDirectory,
  loadOrgNotes,
  loadOrgRequest,
} from '@/features/crm/request-data'
import { resolveOrg } from '../../../../../_data'

type Props = { params: Promise<{ slug: string; requestId: string }> }

export default async function OrgRequestConversationPage({ params }: Props) {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [{ session, request }, notes, { members }] = await Promise.all([
    loadOrgRequest(
      org.id,
      requestId,
      `/orgs/${slug}/workspace/crm/requests/${requestId}`
    ),
    loadOrgNotes(org.id, requestId),
    loadOrgDirectory(org.id),
  ])

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
