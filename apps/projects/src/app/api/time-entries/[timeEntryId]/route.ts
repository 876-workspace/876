import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ timeEntryId: string }> }

const updateTimeEntrySchema = z.strictObject({
  startedAt: z.number().int().nonnegative(),
  endedAt: z.number().int().nonnegative(),
  billable: z.boolean(),
  note: z.string().trim().max(2000).nullable(),
})

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateTimeEntrySchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter the time that was worked.' },
      { status: 422 }
    )

  const { timeEntryId } = await params
  const result = await projects.timeEntries.update(
    auth.orgId,
    decodeURIComponent(timeEntryId),
    auth.userId,
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { timeEntryId } = await params
  const result = await projects.timeEntries.delete(
    auth.orgId,
    decodeURIComponent(timeEntryId),
    auth.userId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
