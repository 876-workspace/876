import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createTimeEntrySchema = z.strictObject({
  projectId: z.string().trim().min(1),
  startedAt: z.number().int().nonnegative(),
  endedAt: z.number().int().nonnegative(),
  billable: z.boolean().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
})

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createTimeEntrySchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a project and the time that was worked.' },
      { status: 422 }
    )

  const result = await projects.timeEntries.create(auth.orgId, {
    ...parsed.data,
    userId: auth.userId,
    createdBy: auth.userId,
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
