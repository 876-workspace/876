import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { createAttachmentLink } from '@/lib/attachment-links'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const shareFileSchema = z.strictObject({
  url: z.string().trim().min(1).max(2000),
  name: z.string().trim().min(1).max(300).optional(),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = shareFileSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid file link.' }, { status: 422 })

  const { projectId } = await params
  const result = await createAttachmentLink(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, createdBy: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The file could not be linked.' },
      { status: result.error?.status === 502 ? 502 : 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
