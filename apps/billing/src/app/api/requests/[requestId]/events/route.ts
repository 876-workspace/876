import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'
import { z } from 'zod'

import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

const idSchema = z.string().trim().min(1)
const createBodySchema = z.union([
  z.strictObject({
    title: z.string().trim().min(1).max(240), allDay: z.literal(false), startAt: z.number().int(), endAt: z.number().int(), timeZone: idSchema,
  }).refine((value) => value.endAt > value.startAt),
  z.strictObject({
    title: z.string().trim().min(1).max(240), allDay: z.literal(true), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), calendarTimeZone: idSchema.optional(),
  }).refine((value) => value.endDate > value.startDate),
])

export const runtime = 'nodejs'

function invalidRequest() {
  const error = getError('crm/invalid-request')
  return apiJson({ data: null, error: toAppError(error) }, { status: error.httpStatus })
}

async function requireRequestPermission(permission: 'customers:read' | 'customers:write') {
  const context = await getWorkspaceContext()
  if (!context || !hasPermission(context, permission))
    return { response: apiJson({ data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } }, { status: 403 }) }
  return { response: null, context }
}

export async function GET(
  _request: Request,
  route: RouteContext<'/api/requests/[requestId]/events'>
) {
  const access = await requireRequestPermission('customers:read')
  if (access.response) return access.response

  const { requestId } = await route.params
  const result = await getCrm().requestEvents.list(access.context.orgId, requestId)
  return apiJson(result, { status: supportResponseStatus(result.error?.code, 200) })
}

export async function POST(
  request: Request,
  route: RouteContext<'/api/requests/[requestId]/events'>
) {
  const access = await requireRequestPermission('customers:write')
  if (access.response) return access.response

  const { requestId } = await route.params
  const body = createBodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return invalidRequest()

  const result = await getCrm().requestEvents.create(access.context.orgId, requestId, {
    ...body.data,
    createdBy: access.context.userId,
  })
  return apiJson(result, { status: supportResponseStatus(result.error?.code, 201) })
}
