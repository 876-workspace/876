import 'server-only'

import { apiJson } from '@876/core/api'

import {
  attachmentErrorResponse,
  attachmentValidationResponse,
  ensureAttachmentLink,
  requireAttachmentAccess,
} from '../_lib/attachments-api'
import { attachmentLinkRequestSchema } from '@/types/attachments'

export const runtime = 'nodejs'

/**
 * Links a file that already exists in Storage to a record.
 *
 * Storage itself refuses a file that is not `ready`, is not owned by the
 * organization this app asserts, or is not disclosable to the asserted actor,
 * so this handler does not re-read the file to decide that.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = attachmentLinkRequestSchema.safeParse(body)
  if (!parsed.success) return attachmentValidationResponse()

  const { fileId, resourceType, resourceId } = parsed.data
  const auth = await requireAttachmentAccess(resourceType)
  if (auth.response) return auth.response

  const link = await ensureAttachmentLink({
    orgId: auth.orgId,
    userId: auth.userId,
    resourceType,
    resourceId,
    fileId,
  })
  if (link.error)
    return attachmentErrorResponse(
      link.error,
      'The attachment could not be linked to this record.'
    )

  return apiJson(
    { data: { linkId: link.data.id, fileId: link.data.file_id } },
    { status: 201 }
  )
}
