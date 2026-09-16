import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { timeErrorStatus } from '@/app/api/_lib/time-error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ timesheetId: string }> }

const rejectTimesheetSchema = z.strictObject({
  note: z.string().trim().min(1).max(2000),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = rejectTimesheetSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter why the timesheet is being rejected.' },
      { status: 422 }
    )

  const { timesheetId } = await params
  const result = await projects.timesheets.reject(
    auth.orgId,
    decodeURIComponent(timesheetId),
    { note: parsed.data.note, decidedBy: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: timeErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
