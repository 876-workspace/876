import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

export async function GET(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const includeMembers =
    request.nextUrl.searchParams.get('includeMembers') === 'true'
  const $876 = await get876Client()

  const result = await $876.teams.list(context.orgId, {
    status: status as never,
    includeMembers,
  })

  return Response.json(result, { status: result.error ? 502 : 200 })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const $876 = await get876Client()

  const result = await $876.teams.create(context.orgId, {
    ...input,
    createdBy: context.userId,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 201 })
}
