import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'
import { z } from 'zod'

import { requireApiCapability } from '@/lib/auth/api-permission'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'
import { getCrm } from '@/lib/clients/crm'

const idSchema = z.string().trim().min(1)
const createBodySchema = z.union([
  z
    .strictObject({
      title: z.string().trim().min(1).max(240),
      allDay: z.literal(false),
      startAt: z.number().int(),
      endAt: z.number().int(),
      timeZone: idSchema,
    })
    .refine((value) => value.endAt > value.startAt),
  z
    .strictObject({
      title: z.string().trim().min(1).max(240),
      allDay: z.literal(true),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      calendarTimeZone: idSchema.optional(),
    })
    .refine((value) => value.endDate > value.startDate),
])

export const runtime = 'nodejs'

function invalidRequest() {
  const error = getError('crm/invalid-request')
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}

export async function GET(
  _request: Request,
  context: RouteContext<'/api/requests/[requestId]/events'>
) {
  const access = await requireApiCapability({
    permission: 'requests.view',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { requestId } = await context.params
  const result = await getCrm().requestEvents.list(access.orgId, requestId)
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/requests/[requestId]/events'>
) {
  const access = await requireApiCapability({
    permission: 'requests.create',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { requestId } = await context.params
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()

  const result = await getCrm().requestEvents.create(access.orgId, requestId, {
    ...body.data,
    createdBy: access.userId,
  })
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
