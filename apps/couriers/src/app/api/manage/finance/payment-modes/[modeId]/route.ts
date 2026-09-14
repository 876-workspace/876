import 'server-only'

import { z } from 'zod'

import { createBillingIntegration } from '@/lib/services/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const deleteBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
})

type RouteContext = { params: Promise<{ modeId: string }> }

/** Updates a payment mode's name or lifecycle flags. */
export async function PATCH(request: Request, context: RouteContext) {
  const body = updateBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-payment-mode')

  // Images are set only through the verified upload route; the strict schema
  // rejects a caller-supplied image file or URL here.
  const { orgSlug, ...params } = body.data
  const access = await requireFinanceAccess(orgSlug)
  if (access.response) return access.response
  if (!access.context) return invalidRequest('finance/invalid-payment-mode')

  const { modeId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.paymentModes.update(
    access.context.orgId,
    modeId,
    params
  )

  return resultResponse('payment-mode', result, 200)
}

/** Deletes a custom payment mode. Billing rejects system or default modes. */
export async function DELETE(request: Request, context: RouteContext) {
  const body = deleteBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-payment-mode')

  const access = await requireFinanceAccess(body.data.orgSlug)
  if (access.response) return access.response
  if (!access.context) return invalidRequest('finance/invalid-payment-mode')

  const { modeId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.paymentModes.delete(access.context.orgId, modeId)

  return resultResponse('payment-mode', result, 200)
}
