import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import type { AdminOrgContactCreateParams } from '@876/admin'

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
] as const satisfies readonly (keyof AdminOrgContactCreateParams)[]

/** Creates a contact. Pure transport over `$876.orgs.contacts.create`. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  const auth = await authorizeOrgRequest(slug, 'org:update')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const firstName =
    typeof body?.first_name === 'string' ? body.first_name.trim() : ''
  if (!firstName) {
    return apiJson({ error: 'A first name is required.' }, { status: 400 })
  }

  const params: Partial<AdminOrgContactCreateParams> = {}
  for (const field of CONTACT_FIELDS) {
    if (body && field in body) params[field] = body[field] as never
  }

  const client = await getAdminClient()
  const { data, error } = await client.orgs.contacts.create(
    auth.membership.organization.id,
    { ...params, first_name: firstName }
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create the contact.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
