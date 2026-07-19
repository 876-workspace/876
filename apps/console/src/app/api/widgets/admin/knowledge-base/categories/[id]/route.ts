import { apiError, apiJson } from '@876/core/api'
import type { KnowledgeWidgetHost } from '@876/widgets'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $widgetsAdmin } from '@/lib/widgets'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

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

  const result = await $widgetsAdmin.kb.categories.update(
    { userId: access.sessionUser.id },
    id,
    {
      slug: typeof record.slug === 'string' ? record.slug : undefined,
      name: typeof record.name === 'string' ? record.name : undefined,
      description:
        record.description === null
          ? null
          : typeof record.description === 'string'
            ? record.description
            : undefined,
      parent_id:
        record.parent_id === null
          ? null
          : typeof record.parent_id === 'string'
            ? record.parent_id
            : undefined,
      sort_order:
        typeof record.sort_order === 'number' ? record.sort_order : undefined,
      hosts,
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
  const result = await $widgetsAdmin.kb.categories.delete(
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
