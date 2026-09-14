import { apiJson } from '@876/core/api'
import { requestStatusSchema } from '@876/crm'
import { z } from 'zod'

import { requireRequestApiAccess } from '@/lib/auth/request-api-access'
import { getCrm } from '@/lib/services/crm'

const updateBodySchema = z
  .object({
    status: requestStatusSchema.optional(),
    priorityId: z.string().trim().min(1).max(160).optional(),
    assigneeId: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0)

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/requests/[requestId]'>
) {
  const access = await requireRequestApiAccess('customers:write')
  if (access.response) return access.response

  const { requestId } = await context.params
  const input = updateBodySchema.parse(await request.json())
  const result = await getCrm().requests.update(
    access.context.orgId,
    requestId,
    input
  )
  return apiJson(result, { status: result.error ? 502 : 200 })
}
