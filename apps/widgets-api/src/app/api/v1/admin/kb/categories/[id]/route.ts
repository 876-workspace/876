import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost, type KbHost } from '@/lib/service/kb'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

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
        ? record.hosts.filter(
            (h): h is KbHost => typeof h === 'string' && isKbHost(h)
          )
        : undefined

  const result = await service.kb.categories.updateCategory({
    actorUserId: auth.actorUserId,
    id,
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
    description:
      record.description === null
        ? null
        : typeof record.description === 'string'
          ? record.description
          : undefined,
    parentId:
      record.parent_id === null
        ? null
        : typeof record.parent_id === 'string'
          ? record.parent_id
          : undefined,
    sortOrder:
      typeof record.sort_order === 'number' ? record.sort_order : undefined,
    hosts,
  })
  return serviceResponse(result)
}

export async function DELETE(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const { id } = await context.params
  const result = await service.kb.categories.deleteCategory({
    actorUserId: auth.actorUserId,
    id,
  })
  return serviceResponse(result)
}
