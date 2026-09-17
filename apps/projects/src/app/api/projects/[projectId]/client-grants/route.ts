import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const inviteGrantSchema = z.strictObject({
  userId: z.string().trim().min(1),
  allowComments: z.boolean().optional(),
  allowDiscussions: z.boolean().optional(),
  allowFiles: z.boolean().optional(),
  allowTime: z.boolean().optional(),
  allowInvoices: z.boolean().optional(),
  allowWiki: z.boolean().optional(),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = inviteGrantSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid client invite.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.clientGrants.invite(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, invitedBy: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The client could not be invited.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
