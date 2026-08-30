import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'

function unauthorized() { return Response.json({ data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } }, { status: 401 }) }

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const result = await crm.requestCategories.list(context.orgId)
  return Response.json(result, { status: result.error ? 502 : 200 })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const result = await crm.requestCategories.create(context.orgId, { ...input, createdBy: context.userId } as never)
  return Response.json(result, { status: result.error ? 400 : 201 })
}
