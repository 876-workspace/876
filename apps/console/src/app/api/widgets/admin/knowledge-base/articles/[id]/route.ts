import { apiError, apiJson } from '@876/core/api'
import type {
  KbArticleAudience,
  KbArticleStatus,
  KnowledgeWidgetHost,
} from '@876/widgets'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $widgetsAdmin } from '@/lib/widgets'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Ctx) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const { id } = await context.params
  const result = await $widgetsAdmin.kb.articles.retrieve(
    { userId: access.sessionUser.id },
    id
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}

export async function PATCH(request: Request, context: Ctx) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const hosts =
    record.hosts === undefined
      ? undefined
      : Array.isArray(record.hosts)
        ? (record.hosts.filter(
            (h) => typeof h === 'string'
          ) as KnowledgeWidgetHost[])
        : undefined

  const result = await $widgetsAdmin.kb.articles.update(
    { userId: access.sessionUser.id },
    id,
    {
      slug: typeof record.slug === 'string' ? record.slug : undefined,
      title: typeof record.title === 'string' ? record.title : undefined,
      summary:
        record.summary === null
          ? null
          : typeof record.summary === 'string'
            ? record.summary
            : undefined,
      body: typeof record.body === 'string' ? record.body : undefined,
      category_id:
        record.category_id === null
          ? null
          : typeof record.category_id === 'string'
            ? record.category_id
            : undefined,
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
  return apiJson({ data: result.data, error: null })
}

export async function DELETE(_request: Request, context: Ctx) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const { id } = await context.params
  const result = await $widgetsAdmin.kb.articles.delete(
    { userId: access.sessionUser.id },
    id
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
