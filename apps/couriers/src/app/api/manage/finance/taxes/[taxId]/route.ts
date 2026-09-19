import 'server-only'

import { z } from 'zod'

import { createBillingIntegration } from '@/lib/clients/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ taxId: string }> }

/**
 * Updates a tax rate's mutable flags. Monetary terms are immutable, so the
 * panel can only activate/archive or promote a rate to default.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const body = updateBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-tax')

  const { orgSlug, ...params } = body.data
  const access = await requireFinanceAccess(orgSlug)
  if (access.response) return access.response
  if (!access.context) return invalidRequest('finance/invalid-tax')

  const { taxId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.taxRates.update(
    access.context.orgId,
    taxId,
    params
  )

  return resultResponse('tax', result, 200)
}
