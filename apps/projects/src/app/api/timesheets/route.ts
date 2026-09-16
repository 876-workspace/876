import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { timeErrorStatus } from '@/app/api/_lib/time-error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const createTimesheetSchema = z.strictObject({
  periodStart: z.number().int().nonnegative(),
  periodEnd: z.number().int().nonnegative(),
  note: z.string().trim().max(2000).nullable().optional(),
})

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createTimesheetSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid period.' }, { status: 422 })

  const result = await projects.timesheets.create(auth.orgId, {
    ...parsed.data,
    userId: auth.userId,
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: timeErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
