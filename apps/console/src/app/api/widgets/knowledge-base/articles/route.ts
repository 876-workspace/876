import { apiError, apiJson } from '@876/core/api'

import { requireKnowledgeBaseMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  const url = new URL(request.url)
  const result = await $widgets.kb.articles.list(
    { userId: access.userId },
    {
      host: 'console',
      max_audience: 'platform_admin',
      category_id: url.searchParams.get('category_id') ?? undefined,
      featured: url.searchParams.get('featured') === 'true',
      q: url.searchParams.get('q') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: Number(url.searchParams.get('limit') ?? '') || undefined,
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
