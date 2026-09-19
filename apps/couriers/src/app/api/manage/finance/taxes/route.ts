import 'server-only'

import { z } from 'zod'

import { createBillingIntegration } from '@/lib/clients/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160),
  rate: z.string().trim().min(1).max(32),
  taxAuthorityId: z.string().trim().min(1).max(160),
  taxType: z.string().trim().min(1).max(64).optional(),
  inclusive: z.boolean().optional(),
  startsAt: z.number().int().nonnegative().nullable().optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  isDefault: z.boolean().optional(),
})

/** Creates a tax rate for the caller's organization. */
export async function POST(request: Request) {
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-tax')

  const { orgSlug, ...params } = body.data
  const { context, response } = await requireFinanceAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-tax')

  const billing = createBillingIntegration()
  const result = await billing.taxRates.create(context.orgId, params)

  return resultResponse('tax', result, 201)
}
