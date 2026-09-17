import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ eventId: string }> }

const addAttendeeSchema = z.strictObject({
  userId: z.string().trim().min(1),
  response: z.enum(['invited', 'accepted', 'declined', 'tentative']).optional(),
})

function errorStatus(code: string): 400 | 404 | 409 {
  if (code === 'projects/attendee-exists') return 409
  if (code === 'projects/event-not-found') return 404
  return 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = addAttendeeSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Choose a valid attendee.' }, { status: 422 })

  const { eventId } = await params
  const result = await projects.events.addAttendee(
    auth.orgId,
    decodeURIComponent(eventId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
