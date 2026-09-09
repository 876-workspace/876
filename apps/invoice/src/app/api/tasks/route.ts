import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { createWorkTaskInputSchema, workTaskImportanceSchema } from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

const filterSchema = z.strictObject({
  listId: z.string().trim().min(1).optional(),
  startingAfter: z.string().trim().min(1).optional(),
})

const dueSchema = z.strictObject({
  at: z.number().int().nonnegative(),
  timeZone: z.string().trim().min(1).max(120),
})

const createSchema = z.strictObject({
  title: z.string().trim().min(1).max(240),
  listId: z.string().trim().min(1).optional(),
  description: z.string().max(10_000).optional().nullable(),
  importance: workTaskImportanceSchema.optional(),
  due: dueSchema.optional().nullable(),
})

export async function GET(request: Request) {
  const auth = await requireWorkWidgetPermission('tasks.view')
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const parsed = filterSchema.safeParse({
    listId: url.searchParams.get('listId') ?? undefined,
    startingAfter: url.searchParams.get('startingAfter') ?? undefined,
  })
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.tasks.list(auth.orgId, {
    assigneeId: auth.userId,
    ...(parsed.data.listId ? { listId: parsed.data.listId } : {}),
    ...(parsed.data.startingAfter
      ? { startingAfter: parsed.data.startingAfter }
      : {}),
    limit: 25,
  })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}

export async function POST(request: Request) {
  const auth = await requireWorkWidgetPermission('tasks.create')
  if (auth.response) return auth.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const candidate = {
    title: parsed.data.title,
    ...(parsed.data.listId ? { listId: parsed.data.listId } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
    ...(parsed.data.importance ? { importance: parsed.data.importance } : {}),
    ...(parsed.data.due
      ? {
          dueAt: parsed.data.due.at,
          dueTimeZone: parsed.data.due.timeZone,
        }
      : {}),
    assigneeId: auth.userId,
    createdBy: auth.userId,
  }
  const canonical = createWorkTaskInputSchema.safeParse(candidate)
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.tasks.create(auth.orgId, canonical.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}
