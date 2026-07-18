import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import type { AdminOrgContactUpdateParams } from '@876/admin'

import { getAdminClient } from '@/lib/auth/admin-client'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

const CONTACT_FIELDS = [
  'user_id',
  'first_name',
  'last_name',
  'title',
  'type',
  'is_primary',
  'email',
  'phone',
  'mobile',
  'notes',
] as const satisfies readonly (keyof AdminOrgContactUpdateParams)[]

/** Updates a contact. Pure transport over `$876.orgs.contacts.update`. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; contactId: string }> }
): Promise<Response> {
  const { slug, contactId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'org:update')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!body) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const updates: AdminOrgContactUpdateParams = {}
  for (const field of CONTACT_FIELDS) {
    if (field in body) updates[field] = body[field] as never
  }

  const client = await getAdminClient()
  const { data, error } = await client.orgs.contacts.update(
    auth.membership.organization.id,
    contactId,
    updates
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update the contact.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

/** Soft-deletes a contact. Pure transport over `$876.orgs.contacts.delete`. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; contactId: string }> }
): Promise<Response> {
  const { slug, contactId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'org:update')
  if (auth.response) return auth.response

  const client = await getAdminClient()
  const { data, error } = await client.orgs.contacts.delete(
    auth.membership.organization.id,
    contactId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete the contact.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
