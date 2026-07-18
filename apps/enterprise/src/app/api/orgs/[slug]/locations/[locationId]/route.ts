import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import type { AdminOrgLocationUpdateParams } from '@876/admin'

import { getAdminClient } from '@/lib/auth/admin-client'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

const LOCATION_FIELDS = [
  'name',
  'code',
  'type',
  'status',
  'is_primary',
  'phone',
  'email',
  'line1',
  'line2',
  'city',
  'region_id',
  'country_code',
  'postal_code',
  'timezone',
] as const satisfies readonly (keyof AdminOrgLocationUpdateParams)[]

/** Updates a location. Pure transport over `$876.orgs.locations.update`. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; locationId: string }> }
): Promise<Response> {
  const { slug, locationId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'structure:manage')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!body) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const updates: AdminOrgLocationUpdateParams = {}
  for (const field of LOCATION_FIELDS) {
    if (field in body) updates[field] = body[field] as never
  }

  const client = await getAdminClient()
  const { data, error } = await client.orgs.locations.update(
    auth.membership.organization.id,
    locationId,
    updates
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update the location.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

/** Soft-deletes a location. Pure transport over `$876.orgs.locations.delete`. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; locationId: string }> }
): Promise<Response> {
  const { slug, locationId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'structure:manage')
  if (auth.response) return auth.response

  const client = await getAdminClient()
  const { data, error } = await client.orgs.locations.delete(
    auth.membership.organization.id,
    locationId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete the location.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
