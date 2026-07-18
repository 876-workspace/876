import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import type { AdminOrganizationUpdateParams } from '@876/admin'

import { getAdminClient } from '@/lib/auth/admin-client'
import { findActiveOrgMembership, hasOrgPermission } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Self-scoped company-details fields a member may edit from the org workspace.
 * This is the exact key set of the SDK's `OrganizationSelfUpdateParams`, so
 * `slug` and `status` can never be mutated through the admin client the handler
 * calls (which itself bypasses the API's `org:update` enforcement — the
 * permission check below is the sole authorization gate).
 */
const EDITABLE_FIELDS = [
  'name',
  'short_name',
  'doing_business_as',
  'logo_url',
  'industry',
  'business_type',
  'registration_number',
  'trn',
  'nis_number',
  'gct_number',
  'tax_id',
  'incorporation_date',
  'primary_phone',
  'primary_email',
  'fax',
  'website_url',
  'support_url',
  'primary_contact_user_id',
  'address_line1',
  'address_line2',
  'city',
  'region_id',
  'country_code',
  'currency_code',
  'timezone',
  'language',
] as const satisfies readonly (keyof AdminOrganizationUpdateParams)[]

/** Updates the current org's company details. Pure transport over `$876.orgs.update`. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return apiJson({ error: 'Not authenticated.' }, { status: 401 })
  }

  const membership = await findActiveOrgMembership(session.user.id, slug)
  if (!membership) {
    return apiJson(
      { error: 'No access to this organization.' },
      {
        status: 403,
      }
    )
  }
  if (!hasOrgPermission(membership, 'org:update')) {
    return apiJson(
      { error: 'You do not have permission to edit company details.' },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!body) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const updates: AdminOrganizationUpdateParams = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      updates[field] = body[field] as never
    }
  }

  const client = await getAdminClient()
  const { data, error } = await client.orgs.update(
    membership.organization.id,
    updates
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update company details.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
