import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ eventId: string; userId: string }> }

const respondAttendeeSchema = z.strictObject({
  response: z.enum(['accepted', 'declined', 'tentative']),
})

function errorStatus(code: string): 400 | 404 {
  if (
    code === 'projects/event-not-found' ||
    code === 'projects/attendee-not-found'
  )
    return 404
  return 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = respondAttendeeSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Choose accept, decline or tentative.' },
      { status: 422 }
    )

  const { eventId, userId } = await params
  const result = await projects.events.respondAttendee(
    auth.orgId,
    decodeURIComponent(eventId),
    decodeURIComponent(userId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { eventId, userId } = await params
  const result = await projects.events.removeAttendee(
    auth.orgId,
    decodeURIComponent(eventId),
    decodeURIComponent(userId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
