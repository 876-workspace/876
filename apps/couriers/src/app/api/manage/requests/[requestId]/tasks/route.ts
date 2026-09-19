import 'server-only'

import { taskStatusSchema } from '@876/crm'
import { z } from 'zod'

import {
  invalidRequest,
  requireRequestAccess,
  resultResponse,
} from '../../_lib/access'
import { crm } from '@/lib/clients/crm'

export const runtime = 'nodejs'
type Context = { params: Promise<{ requestId: string }> }

const createBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priorityId: z.string().trim().min(1).max(160).optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  dueAt: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export async function POST(request: Request, context: Context) {
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()

  const { orgSlug, ...input } = body.data
  const { context: access, response } = await requireRequestAccess(orgSlug)
  if (response) return response
  if (!access) return invalidRequest()

  const { requestId } = await context.params
  const result = await crm.requestTasks.create(access.orgId, requestId, {
    ...input,
    createdBy: access.userId,
  })

  return resultResponse(result, 201)
}
