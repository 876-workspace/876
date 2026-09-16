import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projects } from '@/lib/services/projects'

const followSchema = z.strictObject({ following: z.boolean() })

/**
 * Shared follow/unfollow mutation for projects, phases, and work items.
 *
 * The acting user always comes from the session: the browser only sends
 * the desired end state, never a user id.
 */
export async function handleFollow(
  request: Request,
  input: {
    orgId: string
    userId: string
    subjectType: 'project' | 'phase' | 'work-item'
    subjectId: string
  }
): Promise<Response> {
  const parsed = followSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid follow update.' }, { status: 422 })

  if (parsed.data.following) {
    const result = await projects.followers.follow(input.orgId, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      userId: input.userId,
    })
    if (result.error || !result.data)
      return apiJson(
        { error: result.error?.message ?? 'The record could not be followed.' },
        { status: 400 }
      )
  } else {
    const result = await projects.followers.unfollow(input.orgId, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      userId: input.userId,
    })
    if (result.error)
      return apiJson(
        { error: result.error.message ?? 'The record could not be unfollowed.' },
        { status: 400 }
      )
  }

  return apiJson({ data: { following: parsed.data.following } })
}
