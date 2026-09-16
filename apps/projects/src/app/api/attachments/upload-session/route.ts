import 'server-only'

import { apiJson } from '@876/core/api'

import {
  attachmentErrorResponse,
  attachmentUploadSessionRequestSchema,
  attachmentValidationResponse,
  requireAttachmentAccess,
} from '../_lib/attachments-api'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/services/storage'

export const runtime = 'nodejs'

/**
 * Opens a signed upload session for a record's attachment.
 *
 * The record is authorized first and the file's classification is never the
 * caller's to choose: `projects.attachment` fixes the category, the audience,
 * the object key and the size ceiling server-side. The browser receives only
 * the signed URL and the headers the signature covers.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = attachmentUploadSessionRequestSchema.safeParse(body)
  if (!parsed.success) return attachmentValidationResponse()

  const { resourceType, fileName, contentType, sizeBytes } = parsed.data
  const auth = await requireAttachmentAccess(resourceType)
  if (auth.response) return auth.response

  const result = await storage.uploads.create({
    route_key: 'projects.attachment',
    owner_type: 'organization',
    owner_id: auth.orgId,
    actor_user_id: auth.userId,
    source_app_id: PROJECTS_APP_SLUG,
    file_name: fileName,
    content_type: contentType,
    size_bytes: sizeBytes,
  })
  if (result.error || !result.data)
    return attachmentErrorResponse(
      result.error,
      'The attachment upload could not be started.'
    )

  const session = result.data
  return apiJson(
    {
      data: {
        sessionId: session.id,
        fileId: session.file_id,
        uploadUrl: session.upload_url,
        method: session.method,
        headers: session.headers,
        expiresAt: session.expires_at,
      },
    },
    { status: 201 }
  )
}
