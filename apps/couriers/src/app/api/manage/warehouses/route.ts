import 'server-only'

import { apiJson } from '@876/core/api'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  couriersErrorStatus,
  toWarehouseCreateBody,
  toWarehouseView,
} from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { warehouseCreateParamsSchema } from '@/types/warehouse'

export const runtime = 'nodejs'

const createSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid warehouse.' }, { status: 422 })
  }

  const envelope = createSchema.safeParse(body)
  if (!envelope.success)
    return apiJson({ error: 'Invalid warehouse.' }, { status: 422 })

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'super_admin' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = warehouseCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid warehouse.' },
      { status: 422 }
    )

  const $876 = await getCouriers()
  const result = await $876.warehouses.create(
    toWarehouseCreateBody(parsed.data)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  const warehouse = toWarehouseView(result.data)

  return apiJson({ data: warehouse }, { status: 201 })
}
