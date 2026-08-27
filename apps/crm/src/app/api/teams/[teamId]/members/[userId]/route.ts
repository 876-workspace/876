import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ teamId: string; userId: string }> }

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { teamId, userId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as {
    role?: unknown
  }
  const $876 = await get876Client()

  const result = await $876.teams.members.update(
    context.orgId,
    teamId,
    userId,
    { role: body.role } as never
  )

  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { teamId, userId } = await route.params
  const $876 = await get876Client()
  const result = await $876.teams.members.remove(context.orgId, teamId, userId)

  return Response.json(result, { status: result.error ? 400 : 200 })
}
