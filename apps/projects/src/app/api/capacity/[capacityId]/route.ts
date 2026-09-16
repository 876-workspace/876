import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { serviceFailure, unixSecondsSchema } from '@/app/api/_lib/reporting-api'
import { MAX_MINUTES_PER_WEEK } from '@/features/reports/capacity-input'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ capacityId: string }> }

const updateCapacitySchema = z
  .strictObject({
    minutesPerWeek: z
      .number()
      .int()
      .positive()
      .max(MAX_MINUTES_PER_WEEK)
      .optional(),
    effectiveFrom: unixSecondsSchema.optional(),
    effectiveTo: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.minutesPerWeek !== undefined ||
      data.effectiveFrom !== undefined ||
      data.effectiveTo !== undefined,
    { message: 'At least one field must be provided' }
  )

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateCapacitySchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid capacity.' }, { status: 422 })

  const { capacityId } = await params
  const result = await projects.capacity.update(
    auth.orgId,
    decodeURIComponent(capacityId),
    parsed.data
  )
  if (result.error || !result.data)
    return serviceFailure(result.error, 'The capacity could not be saved.')

  return apiJson({ data: result.data })
}
