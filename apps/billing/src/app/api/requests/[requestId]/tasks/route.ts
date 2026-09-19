import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import { supportResponseStatus, taskStatusSchema } from '@876/crm'
import { z } from 'zod'

import { requireRequestApiAccess } from '@/lib/auth/request-api-access'
import { getCrm } from '@/lib/clients/crm'

const createBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priorityId: z.string().trim().min(1).max(160).optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  dueAt: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

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
  route: RouteContext<'/api/requests/[requestId]/tasks'>
) {
  const access = await requireRequestApiAccess('customers:read')
  if (access.response) return access.response

  const { requestId } = await route.params
  const result = await getCrm().requestTasks.list(
    access.context.orgId,
    requestId
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(
  request: Request,
  route: RouteContext<'/api/requests/[requestId]/tasks'>
) {
  const access = await requireRequestApiAccess('customers:write')
  if (access.response) return access.response

  const { requestId } = await route.params
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()

  const result = await getCrm().requestTasks.create(
    access.context.orgId,
    requestId,
    { ...body.data, createdBy: access.context.userId }
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
