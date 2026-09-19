import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { resolvePortalApiAccess } from '@/lib/portal-access'
import { getPortalClient } from '@/lib/clients/portal'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; discussionId: string }> }

const replySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
})

/**
 * Client-portal discussion reply. The write belongs to the portal API:
 * this handler authorizes the grant and delegates the verified write to
 * the portal client, returning only the portal serializer.
 */
export async function POST(request: Request, { params }: Context) {
  const { projectId, discussionId } = await params
  const decodedProjectId = decodeURIComponent(projectId)
  const decodedDiscussionId = decodeURIComponent(discussionId)

  const gate = await resolvePortalApiAccess(decodedProjectId)
  if (gate.response) return gate.response

  const parsed = replySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a reply.' }, { status: 422 })

  const portal = getPortalClient(gate.access.userId)
  const result = await portal.createDiscussionPost(
    gate.access.orgId,
    decodedProjectId,
    decodedDiscussionId,
    { body: parsed.data.body }
  )
  if (result.error || !result.data) {
    const code = result.error?.code ?? ''
    if (code === 'projects/discussion-locked')
      return apiJson(
        { error: result.error?.message ?? 'This discussion is locked.' },
        { status: 409 }
      )
    if (code === 'projects/portal-forbidden')
      return apiJson(
        { error: result.error?.message ?? 'Not found.' },
        { status: 403 }
      )
    if (
      code === 'projects/client-grant-not-found' ||
      code === 'projects/discussion-not-found' ||
      code === 'projects/not-found' ||
      code.endsWith('-not-found')
    )
      return apiJson({ error: 'Not found.' }, { status: 404 })
    return apiJson(
      { error: result.error?.message ?? 'The reply could not be posted.' },
      { status: 400 }
    )
  }

  return apiJson({ data: result.data }, { status: 201 })
}
