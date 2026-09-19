import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createIssueSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  projectId: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  status: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
    .optional(),
  typeKey: z.string().trim().min(1).max(100).optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  taskListId: z.string().trim().min(1).nullable().optional(),
  cycleId: z.string().trim().min(1).nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).optional(),
  assigneeUserId: z.string().trim().min(1).nullable().optional(),
  parentIssueId: z.string().trim().min(1).nullable().optional(),
  estimate: z.number().int().min(0).max(100).nullable().optional(),
  dueDate: z.number().int().nullable().optional(),
  plannedStartDate: z.number().int().nullable().optional(),
  plannedFinishDate: z.number().int().nullable().optional(),
  plannedDurationMinutes: z.number().int().min(0).nullable().optional(),
  labelIds: z.array(z.string().trim().min(1)).optional(),
  customFields: z
    .array(
      z.strictObject({
        fieldId: z.string().trim().min(1),
        value: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.string().trim().min(1)),
          z.null(),
        ]),
      })
    )
    .optional(),
  position: z.number().int().optional(),
})

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.create',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createIssueSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid issue details.' }, { status: 422 })

  const result = await projects.issues.create(auth.orgId, {
    ...parsed.data,
    creatorUserId: auth.userId,
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The issue could not be created.' },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
