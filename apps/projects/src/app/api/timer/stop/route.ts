import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { timeErrorStatus } from '@/app/api/_lib/time-error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

/** The stop instant is the service's to decide: this route takes no input. */
const stopTimerSchema = z.strictObject({})

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = stopTimerSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Stop the timer with no payload.' }, { status: 422 })

  const result = await projects.timeEntries.stopTimer(auth.orgId, {
    userId: auth.userId,
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: timeErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
