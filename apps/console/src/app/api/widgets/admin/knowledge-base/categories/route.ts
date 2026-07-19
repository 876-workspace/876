import { apiError, apiJson } from '@876/core/api'
import type { KnowledgeWidgetHost } from '@876/widgets'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $widgetsAdmin } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const url = new URL(request.url)
  const result = await $widgetsAdmin.kb.categories.list(
    { userId: access.sessionUser.id },
    {
      host: (url.searchParams.get('host') as KnowledgeWidgetHost) || undefined,
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

  const result = await $widgetsAdmin.kb.categories.create(
    { userId: access.sessionUser.id },
    {
      slug: typeof record.slug === 'string' ? record.slug : '',
      name: typeof record.name === 'string' ? record.name : '',
      description:
        typeof record.description === 'string' ? record.description : undefined,
      parent_id:
        typeof record.parent_id === 'string' ? record.parent_id : undefined,
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
  return apiJson({ data: result.data, error: null }, { status: 201 })
}
