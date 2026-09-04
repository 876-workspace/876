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

const createCommentSchema = z.strictObject({
  issueRef: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10000),
})

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiPermission('comments.create')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a comment.' }, { status: 422 })

  const result = await projects.comments.create(
    auth.orgId,
    parsed.data.issueRef,
    {
      body: parsed.data.body,
      authorUserId: auth.userId,
    }
  )
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
