import { apiError, apiJson } from '@876/core/api'

import { requireKnowledgeBaseMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  const result = await $widgets.kb.categories.list(
    { userId: access.userId },
    { host: 'console' }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
