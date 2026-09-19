import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import { supportResponseStatus, taskStatusSchema } from '@876/crm'
import { z } from 'zod'

import { requireApiCapability } from '@/lib/auth/api-permission'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'
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
  context: RouteContext<'/api/requests/[requestId]/tasks'>
) {
  const access = await requireApiCapability({
    permission: 'requests.view',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { requestId } = await context.params
  const result = await getCrm().requestTasks.list(access.orgId, requestId)
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/requests/[requestId]/tasks'>
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

  const result = await getCrm().requestTasks.create(access.orgId, requestId, {
    ...body.data,
    createdBy: access.userId,
  })
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
