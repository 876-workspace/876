import 'server-only'

import { apiJson } from '@876/core/api'

import {
  attachmentErrorResponse,
  attachmentValidationResponse,
  ensureAttachmentLink,
  requireAttachmentAccess,
} from '../_lib/attachments-api'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/services/storage'
import { attachmentCompleteRequestSchema } from '@/types/attachments'

export const runtime = 'nodejs'

/**
 * Verifies an upload and links the resulting file to the record.
 *
 * The browser's word that the `PUT` succeeded is never trusted: Storage `HEAD`s
 * the object and answers with the verified file. Its owner is then checked
 * against the organization and the app that opened the session, because a
 * session id proves nothing about who the file ended up belonging to.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = attachmentCompleteRequestSchema.safeParse(body)
  if (!parsed.success) return attachmentValidationResponse()

  const { sessionId, resourceType, resourceId } = parsed.data
  const auth = await requireAttachmentAccess(resourceType)
  if (auth.response) return auth.response

  const completed = await storage.uploads.complete(sessionId)
  if (completed.error || !completed.data)
    return attachmentErrorResponse(
      completed.error,
      'The attachment upload could not be verified.'
    )

  const file = completed.data
  if (
    file.status !== 'ready' ||
    file.owner_type !== 'organization' ||
    file.owner_id !== auth.orgId ||
    file.source_app_id !== PROJECTS_APP_SLUG
  )
    return apiJson(
      { error: 'That upload does not belong to this organization.' },
      { status: 409, code: 'storage/invalid-owner' }
    )

  const link = await ensureAttachmentLink({
    orgId: auth.orgId,
    userId: auth.userId,
    resourceType,
    resourceId,
    fileId: file.id,
  })
  if (link.error)
    return attachmentErrorResponse(
      link.error,
      'The attachment could not be linked to this record.'
    )

  return apiJson(
    { data: { linkId: link.data.id, fileId: file.id } },
    { status: 201 }
  )
}
