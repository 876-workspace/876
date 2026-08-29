import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/**
 * The in-app support widget's transport.
 *
 * The widget is the embedded surface of CRM's intake: a member of the
 * organization raises a request about an 876 product from wherever they are,
 * and reads back the ones they have open. It is deliberately thin — it
 * authorizes, resolves who is asking, and calls `$876`.
 */

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

/**
 * Resolves the CRM customer that stands for the signed-in member, creating it
 * on first use.
 *
 * A person filing feedback from inside the workspace is a party the
 * organization now has a relationship with, which is exactly what a `CORE_USER`
 * customer records. Keying the idempotency on the account id makes repeat
 * submissions reuse the same customer instead of accumulating duplicates.
 */
async function resolveRequesterCustomer(
  $876: Awaited<ReturnType<typeof get876Client>>,
  orgId: string,
  userId: string,
  identity: { firstName: string | null; lastName: string | null; email: string }
) {
  const existing = await $876.customerProfiles.list(orgId, {
    customerUserId: userId,
  })
  if (existing.error) return { id: null, error: existing.error }

  const found = existing.data.data[0]
  if (found) return { id: found.profile.id, error: null }

  const created = await $876.customerProfiles.create(orgId, {
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

  const $876 = await get876Client()
  const existing = await $876.customerProfiles.list(context.orgId, {
    customerUserId: context.userId,
  })
  if (existing.error)
    return Response.json({ data: null, error: existing.error }, { status: 502 })

  // No customer yet means nothing has been raised from the widget — an empty
  // list, not an error.
  const customerId = existing.data.data[0]?.profile.id
  if (!customerId)
    return Response.json({ data: { object: 'list', data: [] }, error: null })

  const result = await $876.requests.list(context.orgId, { customerId })
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
  const $876 = await get876Client()

  const customer = await resolveRequesterCustomer(
    $876,
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

  const result = await $876.requests.create(context.orgId, {
    customerId: customer.id,
    subject,
    description: description || null,
    categoryId,
    // Raised through the embedded in-product support surface rather than
    // written up by an agent.
    channel: 'WIDGET',
    requesterUserId: context.userId,
    createdBy: context.userId,
  })

  return Response.json(result, { status: result.error ? 502 : 201 })
}
