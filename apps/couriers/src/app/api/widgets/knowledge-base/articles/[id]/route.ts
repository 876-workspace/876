import { apiError, apiJson } from '@876/core/api'

import { requireKnowledgeBaseMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Ctx) {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  const { id } = await context.params
  const result = await $widgets.kb.articles.retrieve(
    { userId: access.userId },
    id,
    { host: 'couriers', max_audience: 'org_member' }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
