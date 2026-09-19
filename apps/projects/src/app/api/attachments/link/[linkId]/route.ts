import 'server-only'

import { apiJson } from '@876/core/api'

import {
  attachmentErrorResponse,
  attachmentValidationResponse,
  requireAttachmentAccess,
} from '../../_lib/attachments-api'
import { attachmentCaller } from '@/lib/attachments'
import {
  ATTACHMENT_RELATION,
  attachmentResourceRefSchema,
} from '@/types/attachments'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/clients/storage'

export const runtime = 'nodejs'

type Context = { params: Promise<{ linkId: string }> }

/**
 * Removes an attachment link. The file and its bytes are untouched.
 *
 * Storage authorizes a link removal against the *file*, not against the record
 * the link hangs off, so the link must first be found in the record's own links
 * — otherwise any link id this app can reach could be detached from somebody
 * else's record. The record reference travels as a query parameter because a
 * `DELETE` has no body, and it is what decides the permission required.
 */
export async function DELETE(request: Request, { params }: Context) {
  const search = new URL(request.url).searchParams
  const parsed = attachmentResourceRefSchema.safeParse({
    resourceType: search.get('resourceType'),
    resourceId: search.get('resourceId'),
  })
  if (!parsed.success) return attachmentValidationResponse()

  const { resourceType, resourceId } = parsed.data
  const auth = await requireAttachmentAccess(resourceType)
  if (auth.response) return auth.response

  const caller = attachmentCaller(auth)
  const listed = await storage.resourceLinks.list(
    {
      app_id: PROJECTS_APP_SLUG,
      resource_type: resourceType,
      resource_id: resourceId,
      relation: ATTACHMENT_RELATION,
    },
    caller
  )
  if (listed.error || !listed.data)
    return attachmentErrorResponse(
      listed.error,
      'The attachment could not be removed.'
    )

  const { linkId } = await params
  const link = listed.data.data.find(
    (candidate) => candidate.id === decodeURIComponent(linkId)
  )
  if (!link)
    return apiJson(
      { error: 'That attachment is no longer on this record.' },
      { status: 404, code: 'storage/resource-link-not-found' }
    )

  const deleted = await storage.resourceLinks.delete(link.id, caller)
  if (deleted.error || !deleted.data)
    return attachmentErrorResponse(
      deleted.error,
      'The attachment could not be removed.'
    )

  return apiJson({ data: deleted.data })
}
