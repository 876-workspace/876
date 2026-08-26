import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ customerId: string }> }

function statusFor(code: string | undefined) {
  return code === 'crm/customer-not-found' ? 404 : 400
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const { customerId } = await route.params
  const result = await $876.customerProfiles.retrieve(context.orgId, customerId)
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const { customerId } = await route.params
  const input = await request.json().catch(() => null)
  const result = await $876.customerProfiles.update(
    context.orgId,
    customerId,
    input as never
  )
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const { customerId } = await route.params
  const input = (await request.json().catch(() => ({}))) as { reason?: string | null }
  const result = await $876.customerProfiles.delete(context.orgId, customerId, {
    deletedBy: context.userId,
    reason: input.reason ?? null,
  })
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}
