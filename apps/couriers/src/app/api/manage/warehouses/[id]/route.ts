import 'server-only'

import { apiJson } from '@876/core/api'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toWarehouseUpdateBody, toWarehouseView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { warehouseUpdateParamsSchema } from '@/types/warehouse'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('warehouse/invalid')
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return errorResponse('warehouse/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = warehouseUpdateParamsSchema.safeParse(rest)
  if (!parsed.success) return errorResponse('warehouse/invalid')

  const $876 = await getCouriers()
  const result = await $876.warehouses.update(
    id,
    toWarehouseUpdateBody(parsed.data)
  )
  if (result.error) return errorResponse(result.error.code)

  const warehouse = toWarehouseView(result.data)

  return apiJson({ data: warehouse })
}
