import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ requestId: string }> }

function statusFor(code: string | undefined) {
  if (code === 'crm/request-not-found') return 404
  return 400
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) {
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )
  }

  const $876 = await get876Client()

  const { requestId } = await route.params
  const result = await $876.requestNotes.list(context.orgId, requestId)
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function POST(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) {
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )
  }

  const $876 = await get876Client()

  const { requestId } = await route.params
  const input = (await request.json().catch(() => null)) as {
    body?: string
    internal?: boolean
  } | null

  if (!input?.body?.trim()) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'crm/invalid-body',
          message: 'Note text cannot be empty.',
        },
      },
      { status: 400 }
    )
  }

  const result = await $876.requestNotes.create(context.orgId, requestId, {
    body: input.body.trim(),
    authorId: context.userId,
    internal: input.internal ?? true,
  })

  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 201,
  })
}
