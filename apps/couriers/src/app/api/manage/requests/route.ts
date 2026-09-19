import 'server-only'

import { z } from 'zod'

import {
  invalidRequest,
  requireRequestAccess,
  resultResponse,
} from './_lib/access'
import { crm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

const createBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  customerId: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  priorityId: z.string().trim().max(160).optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
})

export async function POST(request: Request) {
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()

  const { orgSlug, customerId, ...input } = body.data
  const { context, response } = await requireRequestAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest()

  const result = await crm.requests.createForBillingCustomer(
    context.orgId,
    customerId,
    { ...input, createdBy: context.userId }
  )

  return resultResponse(result, 201)
}
