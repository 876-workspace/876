import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { INVOICE_APP_SLUG } from '@/lib/invoice-app'

export const runtime = 'nodejs'

const organizationSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
})

/** Slug/name collisions the caller can fix by choosing another name. */
const CONFLICT_CODES = new Set([
  'organization/slug-taken',
  'organization/already-exists',
])

/**
 * Creates the signed-in account's organization when it has none, then
 * activates the `876-invoice` subscription for it.
 *
 * Pure transport: the organization, its owner membership, and the Billing
 * finance workspace are all created by the platform — the workspace arrives on
 * its own through the provisioning manifest's `finance_connection.ensure`
 * event, so this route never touches Billing.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

  const platform = await getPlatformClient()

  // Resolved live rather than from the sealed session cookie, so an
  // organization created moments ago is seen on this request.
  const memberships = await platform.memberships.listRouting({
    userId: session.user.id,
  })
  if (memberships.error)
    return apiJson({ error: 'Failed to verify workspace.' }, { status: 500 })

  let organizationId = memberships.data.data[0]?.organization.id

  if (!organizationId) {
    const organization = await platform.organizations.create({
      ownerUserId: session.user.id,
      name: parsed.data.name,
    })
    if (organization.error) {
      const status = CONFLICT_CODES.has(organization.error.code) ? 409 : 502
      return apiJson(
        { error: organization.error.message },
        { status, code: organization.error.code }
      )
    }

    organizationId = organization.data.id
  }

  const subscription = await platform.subscriptions.create(organizationId, {
    appSlug: INVOICE_APP_SLUG,
  })
  if (subscription.error)
    return apiJson(
      { error: 'Failed to activate 876 Invoice.' },
      { status: 502, code: subscription.error.code }
    )

  return apiJson({
    data: {
      object: 'onboarding_completion',
      organization_id: organizationId,
      access_status: 'active',
    },
  })
}
