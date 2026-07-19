import { apiError, apiJson } from '@876/core/api'
import type {
  KbArticleAudience,
  KbArticleStatus,
  KnowledgeWidgetHost,
} from '@876/widgets'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $widgetsAdmin } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const url = new URL(request.url)
  const result = await $widgetsAdmin.kb.articles.list(
    { userId: access.sessionUser.id },
    {
      status: (url.searchParams.get('status') as KbArticleStatus) || undefined,
      host: (url.searchParams.get('host') as KnowledgeWidgetHost) || undefined,
      audience:
        (url.searchParams.get('audience') as KbArticleAudience) || undefined,
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

export async function POST(request: Request) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const hosts = Array.isArray(record.hosts)
    ? (record.hosts.filter(
        (h) => typeof h === 'string'
      ) as KnowledgeWidgetHost[])
    : []

  const result = await $widgetsAdmin.kb.articles.create(
    { userId: access.sessionUser.id },
    {
      slug: typeof record.slug === 'string' ? record.slug : '',
      title: typeof record.title === 'string' ? record.title : '',
      summary: typeof record.summary === 'string' ? record.summary : undefined,
      body: typeof record.body === 'string' ? record.body : '',
      category_id:
        typeof record.category_id === 'string' ? record.category_id : undefined,
      status:
        typeof record.status === 'string'
          ? (record.status as KbArticleStatus)
          : undefined,
      audience:
        typeof record.audience === 'string'
          ? (record.audience as KbArticleAudience)
          : undefined,
      hosts,
      featured:
        typeof record.featured === 'boolean' ? record.featured : undefined,
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null }, { status: 201 })
}
