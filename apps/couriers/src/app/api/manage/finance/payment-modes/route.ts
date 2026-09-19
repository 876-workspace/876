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
  isDefault: z.boolean().optional(),
})

/** Creates a payment mode for the caller's organization. */
export async function POST(request: Request) {
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-payment-mode')

  const { orgSlug, ...params } = body.data
  const { context, response } = await requireFinanceAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-payment-mode')

  const billing = createBillingIntegration()
  const result = await billing.paymentModes.create(context.orgId, params)

  return resultResponse('payment-mode', result, 201)
}
