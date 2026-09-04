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

const updateCommentSchema = z.strictObject({
  issueRef: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10000),
})

const deleteCommentSchema = z.strictObject({
  issueRef: z.string().trim().min(1).max(120),
})

type Context = { params: Promise<{ commentId: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiPermission('comments.edit')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateCommentSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a comment.' }, { status: 422 })

  const { commentId } = await params
  const result = await projects.comments.update(
    auth.orgId,
    parsed.data.issueRef,
    commentId,
    { body: parsed.data.body, actorUserId: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: result.error.httpStatus }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiPermission('comments.delete')
  if (auth.response) return auth.response

  const parsed = deleteCommentSchema.safeParse({
    issueRef: request.nextUrl.searchParams.get('issueRef'),
  })
  if (!parsed.success)
    return apiJson(
      { error: 'An issue reference is required.' },
      { status: 422 }
    )

  const { commentId } = await params
  const result = await projects.comments.delete(
    auth.orgId,
    parsed.data.issueRef,
    commentId,
    auth.userId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: result.error.httpStatus }
    )

  return apiJson({ data: result.data })
}
