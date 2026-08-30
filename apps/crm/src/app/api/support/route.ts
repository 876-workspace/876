import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { crm } from '@/lib/services/crm'

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

async function resolveRequesterCustomer(
  orgId: string,
  userId: string,
  identity: { firstName: string | null; lastName: string | null; email: string }
) {
  const existing = await crm.customers.list(orgId, { customerUserId: userId })
  if (existing.error) return { id: null, error: existing.error }
  const found = existing.data.data[0]
  if (found) return { id: found.profile.id, error: null }
  const created = await crm.customers.create(orgId, {
    idempotencyKey: `crm:support:${userId}`,
    customerKind: 'INDIVIDUAL',
    userId,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
  })
  if (created.error) return { id: null, error: created.error }
  return { id: created.data.profile.id, error: null }
}

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const existing = await crm.customers.list(context.orgId, {
    customerUserId: context.userId,
  })
  if (existing.error)
    return Response.json({ data: null, error: existing.error }, { status: 502 })
  const customerId = existing.data.data[0]?.profile.id
  if (!customerId)
    return Response.json({ data: { object: 'list', data: [] }, error: null })
  const result = await crm.requests.list(context.orgId, { customerId })
  return Response.json(result, { status: result.error ? 502 : 200 })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const body = await request.json().catch(() => null)
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const description =
    typeof body?.description === 'string' ? body.description.trim() : ''
  const categoryId =
    typeof body?.categoryId === 'string' && body.categoryId
      ? body.categoryId
      : null
  if (!subject)
    return Response.json(
      {
        data: null,
        error: {
          code: 'crm/invalid-request',
          message: 'A subject is required.',
        },
      },
      { status: 400 }
    )
  const session = await getAuthSession()
  const user = isSignedSession(session) ? session.user : null
  const customer = await resolveRequesterCustomer(
    context.orgId,
    context.userId,
    {
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      email: user?.email ?? '',
    }
  )
  if (customer.error || !customer.id)
    return Response.json({ data: null, error: customer.error }, { status: 502 })
  const result = await crm.requests.create(context.orgId, {
    customerId: customer.id,
    subject,
    description: description || null,
    categoryId,
    channel: 'WIDGET',
    requesterUserId: context.userId,
    createdBy: context.userId,
  })
  return Response.json(result, { status: result.error ? 502 : 201 })
}
