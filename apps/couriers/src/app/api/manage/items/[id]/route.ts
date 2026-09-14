import 'server-only'

import { z } from 'zod'
import { createBillingIntegration } from '@/lib/services/billing'
import {
  invalidItemRequest,
  itemResultResponse,
  requireItemAccess,
} from '../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const updateSchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  type: z.enum(['SERVICE', 'GOOD']).optional(),
  name: z.string().trim().min(1).optional(),
  sku: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  defaultSellingAmount: z.string().nullable().optional(),
  defaultSellingCurrency: z.string().length(3).nullable().optional(),
  isTaxable: z.boolean().optional(),
  taxCode: z.string().nullable().optional(),
  trackStock: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  allowOutOfStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, route: Context) {
  const body = updateSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidItemRequest()
  const { context, response } = await requireItemAccess(body.data.orgSlug)
  if (response || !context) return response ?? invalidItemRequest()
  const { id } = await route.params
  const { orgSlug: _orgSlug, ...params } = body.data
  return itemResultResponse(
    await createBillingIntegration().items.update(context.orgId, id, params),
    200
  )
}
