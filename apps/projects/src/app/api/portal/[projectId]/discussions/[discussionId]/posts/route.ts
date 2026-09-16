import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { resolvePortalApiAccess } from '@/lib/portal-access'
import { getPortalClient } from '@/lib/services/portal'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; discussionId: string }> }

const replySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
})

/**
 * Client-portal discussion reply.
 *
 * The grant is resolved through the portal client (never `projects.view`):
 * retrieving the discussion through it proves both the live grant and the
 * record's client visibility. The write itself goes through the internal
 * client with the portal user as author, since the portal route family is
 * read-only.
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
  const visible = await portal.retrieveDiscussion(
    gate.access.orgId,
    decodedProjectId,
    decodedDiscussionId
  )
  if (visible.error || !visible.data)
    return apiJson({ error: 'Not found.' }, { status: 404 })

  const result = await projects.discussions.createPost(
    gate.access.orgId,
    decodedProjectId,
    decodedDiscussionId,
    { ...parsed.data, authorUserId: gate.access.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The reply could not be posted.' },
      {
        status:
          result.error?.code === 'projects/discussion-locked' ? 403 : 400,
      }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
