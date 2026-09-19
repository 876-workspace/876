import 'server-only'

import { requestStatusSchema } from '@876/crm'
import { z } from 'zod'

import {
  invalidRequest,
  requireRequestAccess,
  resultResponse,
} from '../_lib/access'
import { crm } from '@/lib/clients/crm'

export const runtime = 'nodejs'
type Context = { params: Promise<{ requestId: string }> }

const updateBodySchema = z
  .strictObject({
    orgSlug: z.string().trim().min(1),
    status: requestStatusSchema.optional(),
    priorityId: z.string().trim().min(1).max(160).optional(),
    assigneeId: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 1)

export async function PATCH(request: Request, context: Context) {
  const body = updateBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()

  const { orgSlug, ...input } = body.data
  const { context: access, response } = await requireRequestAccess(orgSlug)
  if (response) return response
  if (!access) return invalidRequest()

  const { requestId } = await context.params
  const result = await crm.requests.update(access.orgId, requestId, input)

  return resultResponse(result, 200)
}
