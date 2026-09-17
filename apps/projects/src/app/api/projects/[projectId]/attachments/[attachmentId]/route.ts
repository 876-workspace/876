import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { deleteAttachmentLink } from '@/lib/attachment-links'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; attachmentId: string }> }

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { projectId, attachmentId } = await params
  const result = await deleteAttachmentLink(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(attachmentId)
  )
  const status =
    result.error?.status === 404
      ? 404
      : result.error?.status === 502
        ? 502
        : 400
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The attachment could not be deleted.',
      },
      { status }
    )

  return apiJson({
    data: {
      object: 'projects.attachment-link',
      id: decodeURIComponent(attachmentId),
      deleted: true,
    },
  })
}
