import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const createPageSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(100000),
  slug: slugSchema.optional(),
  parentPageId: z.string().trim().min(1).nullable().optional(),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = createPageSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid wiki page.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.wiki.create(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, authorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The wiki page could not be created.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
