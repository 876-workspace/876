import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { resolvePortalApiAccess } from '@/lib/portal-access'
import { getPortalClient } from '@/lib/services/portal'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; phaseId: string }> }

const commentSchema = z.strictObject({
  body: z.string().trim().min(1).max(10000),
})

/**
 * Client-portal phase comment. Retrieving the phase through the portal
 * client proves the live grant and the record's client visibility before
 * the internal client records the comment under the portal user.
 */
export async function POST(request: Request, { params }: Context) {
  const { projectId, phaseId } = await params
  const decodedProjectId = decodeURIComponent(projectId)
  const decodedPhaseId = decodeURIComponent(phaseId)

  const gate = await resolvePortalApiAccess(decodedProjectId)
  if (gate.response) return gate.response

  const parsed = commentSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a comment.' }, { status: 422 })

  const portal = getPortalClient(gate.access.userId)
  const visible = await portal.retrieveMilestone(
    gate.access.orgId,
    decodedProjectId,
    decodedPhaseId
  )
  if (visible.error || !visible.data)
    return apiJson({ error: 'Not found.' }, { status: 404 })

  const result = await projects.milestones.comments.create(
    gate.access.orgId,
    decodedPhaseId,
    { body: parsed.data.body, authorUserId: gate.access.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The comment could not be added.' },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
