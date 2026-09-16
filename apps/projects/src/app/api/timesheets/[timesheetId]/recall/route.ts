import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { timeErrorStatus } from '@/app/api/_lib/time-error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ timesheetId: string }> }

const recallTimesheetSchema = z.strictObject({})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = recallTimesheetSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Recall the timesheet with no payload.' },
      { status: 422 }
    )

  const { timesheetId } = await params
  const result = await projects.timesheets.recall(
    auth.orgId,
    decodeURIComponent(timesheetId),
    auth.userId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: timeErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
