import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import {
  requireApiPermission,
  type ApiContext,
} from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const createIssueSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  projectId: z.string().trim().min(1).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  status: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
    .optional(),
  typeKey: z.string().trim().min(1).max(100).optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).optional(),
  customFields: z
    .array(
      z.strictObject({
        fieldId: z.string().trim().min(1),
        value: z.union([
          z.string(),
          z.number().int(),
          z.boolean(),
          z.array(z.string().trim().min(1)),
          z.null(),
        ]),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiPermission('issues.create')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createIssueSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter an issue title.' }, { status: 422 })

  const result = await projects.issues.create(auth.orgId, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
