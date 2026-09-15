import 'server-only'

import { apiJson } from '@876/core/api'
import {
  issuePrioritySchema,
  workflowStateKeySchema,
} from '@876/projects/contracts'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

const customFieldValueSchema = z.strictObject({
  fieldId: z.string().trim().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string().trim().min(1)),
    z.null(),
  ]),
})

const updateIssueSchema = z
  .strictObject({
    projectId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().nullable().optional(),
    status: workflowStateKeySchema.optional(),
    typeKey: z.string().trim().min(1).max(100).optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    priority: issuePrioritySchema.optional(),
    assigneeUserId: z.string().trim().min(1).nullable().optional(),
    creatorUserId: z.string().trim().min(1).nullable().optional(),
    parentIssueId: z.string().trim().min(1).nullable().optional(),
    estimate: z.number().int().min(0).max(100).nullable().optional(),
    dueDate: z.number().int().nullable().optional(),
    labelIds: z.array(z.string().trim().min(1)).optional(),
    customFields: z.array(customFieldValueSchema).optional(),
    position: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  })

function issueErrorStatus(code: string): 400 | 404 {
  return code === 'projects/issue-not-found' ? 404 : 400
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateIssueSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid issue update.' }, { status: 422 })

  const { issueRef } = await params
  const result = await projects.issues.update(
    auth.orgId,
    decodeURIComponent(issueRef),
    { ...parsed.data, actorUserId: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: issueErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
