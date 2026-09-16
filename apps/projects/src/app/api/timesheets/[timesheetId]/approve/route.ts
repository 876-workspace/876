import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ timesheetId: string }> }

/** The approver is the session, never the body — the service rejects self-approval. */
const approveTimesheetSchema = z.strictObject({
  note: z.string().trim().max(2000).nullable().optional(),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = approveTimesheetSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid note.' }, { status: 422 })

  const { timesheetId } = await params
  const result = await projects.timesheets.approve(
    auth.orgId,
    decodeURIComponent(timesheetId),
    { note: parsed.data.note ?? null, decidedBy: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
