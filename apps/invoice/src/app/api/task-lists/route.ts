import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { createWorkTaskListInputSchema } from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

export const runtime = 'nodejs'

const createSchema = z.strictObject({
  name: z.string().trim().min(1).max(240),
  description: z.string().max(10_000).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

/** Lists canonical Work task lists available to the signed-in organization. */
export async function GET() {
  const auth = await requireWorkWidgetPermission('tasks.view')
  if (auth.response) return auth.response

  const work = await getWork()
  const result = await work.taskLists.list(auth.orgId, { limit: 100 })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}

export async function POST(request: Request) {
  const auth = await requireWorkWidgetPermission('tasks.create')
  if (auth.response) return auth.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkTaskListInputSchema.safeParse({
    ...parsed.data,
    ownerUserId: auth.userId,
    createdBy: auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.taskLists.create(auth.orgId, canonical.data)
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}
