import { apiError, apiJson } from '@876/core/api'

import { requireKnowledgeBaseMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  const result = await $widgets.kb.bookmarks.list(
    { userId: access.userId },
    { host: 'console', max_audience: 'platform_admin' }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}

export async function POST(request: Request) {
  const access = await requireKnowledgeBaseMember()
  if (access.response) return access.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const articleId =
    typeof record.article_id === 'string' ? record.article_id : ''
  if (!articleId) return apiError('article_id is required.', { status: 400 })

  const result = await $widgets.kb.bookmarks.create(
    { userId: access.userId },
    { article_id: articleId, host: 'console' }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null }, { status: 201 })
}
