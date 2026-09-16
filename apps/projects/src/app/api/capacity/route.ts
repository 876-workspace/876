import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  searchParamsOf,
  serviceFailure,
  unixSecondsSchema,
} from '@/app/api/_lib/reporting-api'
import { MAX_MINUTES_PER_WEEK } from '@/features/reports/capacity-input'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const listQuerySchema = z.strictObject({
  userId: z.string().trim().min(1).optional(),
})

const createCapacitySchema = z.strictObject({
  userId: z.string().trim().min(1).max(200),
  minutesPerWeek: z.number().int().positive().max(MAX_MINUTES_PER_WEEK),
  effectiveFrom: unixSecondsSchema,
  effectiveTo: unixSecondsSchema.nullable().optional(),
})

export async function GET(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = listQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid member.' }, { status: 422 })

  const result = await projects.capacity.list(auth.orgId, parsed.data)
  if (result.error || !result.data)
    return serviceFailure(result.error, 'Capacity could not be loaded.')

  return apiJson({ data: result.data })
}

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCapacitySchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid capacity.' }, { status: 422 })

  const result = await projects.capacity.create(auth.orgId, parsed.data)
  if (result.error || !result.data)
    return serviceFailure(result.error, 'The capacity could not be saved.')

  return apiJson({ data: result.data }, { status: 201 })
}
