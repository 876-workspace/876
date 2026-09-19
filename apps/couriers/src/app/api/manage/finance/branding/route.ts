import 'server-only'

import { brandingUpdateSchema } from '@876/core/branding'
import { z } from 'zod'

import { createBillingIntegration } from '@/lib/clients/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  ...brandingUpdateSchema.shape,
})

/** Updates the caller's organization branding (accent, appearance, tone). */
export async function PATCH(request: Request) {
  const body = updateBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-branding')

  const { orgSlug, ...params } = body.data
  const { context, response } = await requireFinanceAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-branding')

  const billing = createBillingIntegration()
  const result = await billing.branding.update(context.orgId, params)

  return resultResponse('branding', result, 200)
}
