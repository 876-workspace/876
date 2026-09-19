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

const updateSchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  symbol: z.string().max(16).nullable().optional(),
  decimalPlaces: z.number().int().min(0).max(4),
})
const deleteSchema = z.strictObject({ orgSlug: z.string().trim().min(1) })
type RouteContext = { params: Promise<{ code: string }> }

/** Updates display metadata for an enabled currency. */
export async function PATCH(request: Request, route: RouteContext) {
  const body = updateSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidRequest('finance/invalid-currency')
  const { context, response } = await requireFinanceAccess(body.data.orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-currency')

  const { code } = await route.params
  const { orgSlug: _orgSlug, ...params } = body.data
  return resultResponse(
    'currency',
    await createBillingIntegration().currencies.update(
      context.orgId,
      code,
      params
    ),
    200
  )
}

/** Disables a non-default currency. */
export async function DELETE(request: Request, route: RouteContext) {
  const body = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidRequest('finance/invalid-currency')
  const { context, response } = await requireFinanceAccess(body.data.orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-currency')

  const { code } = await route.params
  return resultResponse(
    'currency',
    await createBillingIntegration().currencies.disable(context.orgId, code),
    200
  )
}
