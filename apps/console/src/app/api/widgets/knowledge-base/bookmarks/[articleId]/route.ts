import { apiError, apiJson } from '@876/core/api'

import { requireKnowledgeBaseMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ articleId: string }> }

export async function DELETE(_request: Request, context: Ctx) {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  const { articleId } = await context.params
  const result = await $widgets.kb.bookmarks.delete(
    { userId: access.userId },
    decodeURIComponent(articleId)
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
