import 'server-only'

import { apiJson } from '@876/core/api'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  couriersErrorStatus,
  toBranchUpdateBody,
  toBranchView,
} from '@/lib/couriers'
import { $876 } from '@/lib/876'
import { branchUpdateParamsSchema } from '@/types/branch'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid branch.' }, { status: 422 })
  }

  const envelope = envelopeSchema.safeParse(body)
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

  const tenantId = ctx.tenant.id

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = branchUpdateParamsSchema.safeParse(rest)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid branch.' },
      { status: 422 }
    )

  const result = await $876.branches.update(
    tenantId,
    id,
    toBranchUpdateBody(parsed.data)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  const branch = toBranchView(result.data)

  return apiJson({ data: branch })
}
