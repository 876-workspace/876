import 'server-only'

import { z } from 'zod'
import { createBillingIntegration } from '@/lib/clients/billing'
import {
  invalidItemRequest,
  itemResultResponse,
  requireItemAccess,
} from './_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const itemSchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  idempotencyKey: z.string().min(8).max(255),
  type: z.enum(['SERVICE', 'GOOD']),
  name: z.string().trim().min(1),
  sku: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  defaultSellingAmount: z.string().nullable().optional(),
  defaultSellingCurrency: z.string().length(3).nullable().optional(),
  isTaxable: z.boolean().optional(),
  taxCode: z.string().nullable().optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  allowOutOfStock: z.boolean().optional(),
})

export async function POST(request: Request) {
  const body = itemSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidItemRequest()
  const { context, response } = await requireItemAccess(body.data.orgSlug)
  if (response || !context) return response ?? invalidItemRequest()
  const { orgSlug: _orgSlug, idempotencyKey, ...params } = body.data
  return itemResultResponse(
    await createBillingIntegration().items.create(context.orgId, params, {
      idempotencyKey,
    }),
    201
  )
}
