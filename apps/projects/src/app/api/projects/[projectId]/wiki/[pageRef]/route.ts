import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; pageRef: string }> }

const updatePageSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().trim().min(1).max(100000).optional(),
    parentPageId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one page field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/wiki-page-not-found' ? 404 : 400
}

async function ids(context: Context) {
  const { projectId, pageRef } = await context.params
  return {
    projectId: decodeURIComponent(projectId),
    pageRef: decodeURIComponent(pageRef),
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = updatePageSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid wiki page update.' },
      { status: 422 }
    )

  const { projectId, pageRef } = await ids(context)
  const result = await projects.wiki.update(auth.orgId, projectId, pageRef, {
    ...parsed.data,
    authorUserId: auth.userId,
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The wiki page could not be updated.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, context: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { projectId, pageRef } = await ids(context)
  const result = await projects.wiki.delete(auth.orgId, projectId, pageRef)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
