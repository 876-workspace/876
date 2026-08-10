import 'server-only'

import { apiJson } from '@876/core/api'
import { after, type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  $couriers,
  couriersErrorStatus,
  toWarehouseCreateBody,
  toWarehouseView,
} from '@/lib/couriers'
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
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const tenantId = ctx.tenant.id

  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = warehouseCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid warehouse.' },
      { status: 422 }
    )

  const result = await $couriers.warehouses.create(
    tenantId,
    toWarehouseCreateBody(parsed.data)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  const warehouse = toWarehouseView(result.data)
  after(() =>
    $couriers.organizationLocations.sync(tenantId, {
      kind: 'warehouse',
      site_id: warehouse.id,
    })
  )

  return apiJson({ data: warehouse }, { status: 201 })
}
