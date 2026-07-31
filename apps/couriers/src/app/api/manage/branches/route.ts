import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
import { branchCreateParamsSchema } from '@/types/branch'

export const runtime = 'nodejs'

const createSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid branch.' }, { status: 422 })
  }

  const envelope = createSchema.safeParse(body)
  if (!envelope.success)
    return apiJson({ error: 'Invalid branch.' }, { status: 422 })

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = branchCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid branch.' },
      { status: 422 }
    )

  const result = await service.branches.create(ctx.tenant.id, parsed.data)
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
