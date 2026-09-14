import 'server-only'

import { z } from 'zod'

import {
  invalidRequest,
  requireRequestAccess,
  resultResponse,
} from '../../_lib/access'
import { crm } from '@/lib/services/crm'

export const runtime = 'nodejs'
type Context = { params: Promise<{ requestId: string }> }

const idSchema = z.string().trim().min(1)
const createBodySchema = z.union([
  z
    .strictObject({
      orgSlug: z.string().trim().min(1),
      title: z.string().trim().min(1).max(240),
      allDay: z.literal(false),
      startAt: z.number().int(),
      endAt: z.number().int(),
      timeZone: idSchema,
    })
    .refine((value) => value.endAt > value.startAt),
  z
    .strictObject({
      orgSlug: z.string().trim().min(1),
      title: z.string().trim().min(1).max(240),
      allDay: z.literal(true),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      calendarTimeZone: idSchema.optional(),
    })
    .refine((value) => value.endDate > value.startDate),
])

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
  const result = await crm.requestEvents.create(access.orgId, requestId, {
    ...input,
    createdBy: access.userId,
  })

  return resultResponse(result, 201)
}
