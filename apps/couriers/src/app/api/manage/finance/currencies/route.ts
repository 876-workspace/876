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

const currencySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  currency: z.string().trim().length(3).toUpperCase(),
})

/** Enables a currency for the caller's finance workspace. */
export async function POST(request: Request) {
  const body = currencySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidRequest('finance/invalid-currency')

  const { context, response } = await requireFinanceAccess(body.data.orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-currency')

  return resultResponse(
    'currency',
    await createBillingIntegration().currencies.enable(context.orgId, {
      currency: body.data.currency,
    }),
    201
  )
}

/** Changes the default currency for the caller's finance workspace. */
export async function PATCH(request: Request) {
  const body = currencySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidRequest('finance/invalid-currency')

  const { context, response } = await requireFinanceAccess(body.data.orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-currency')

  return resultResponse(
    'currency',
    await createBillingIntegration().currencies.setDefault(context.orgId, {
      currency: body.data.currency,
    }),
    200
  )
}
