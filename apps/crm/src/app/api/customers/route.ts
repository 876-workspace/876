import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crmApi } from '@/lib/crm-api'

async function forward(response: Response) {
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  return forward(await crmApi(`/v1/organizations/${encodeURIComponent(context.orgId)}/customers`))
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  const input = await request.json().catch(() => null)
  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim()
  if (!idempotencyKey)
    return Response.json({ error: 'Missing idempotency key.' }, { status: 400 })

  return forward(
    await crmApi(`/v1/organizations/${encodeURIComponent(context.orgId)}/customers`, {
      method: 'POST',
      body: JSON.stringify({ ...input, idempotencyKey }),
    })
  )
}
