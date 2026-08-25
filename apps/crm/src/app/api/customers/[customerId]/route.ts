import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crmApi } from '@/lib/crm-api'

type Context = { params: Promise<{ customerId: string }> }

async function forward(response: Response) {
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}

function path(orgId: string, customerId: string) {
  return `/v1/organizations/${encodeURIComponent(orgId)}/customers/${encodeURIComponent(customerId)}`
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const { customerId } = await route.params
  return forward(await crmApi(path(context.orgId, customerId)))
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const { customerId } = await route.params
  const body = await request.text()
  return forward(await crmApi(path(context.orgId, customerId), { method: 'PATCH', body }))
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const { customerId } = await route.params
  const input = await request.json().catch(() => ({})) as { reason?: string | null }
  return forward(
    await crmApi(path(context.orgId, customerId), {
      method: 'DELETE',
      body: JSON.stringify({ deletedBy: context.userId, reason: input.reason ?? null }),
    })
  )
}
