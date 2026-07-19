import 'server-only'

import { apiJson } from '@876/core/api'
import type { PlatformOrgProfileUpdateParams } from '@876/core/platform'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'

export const runtime = 'nodejs'

/** Trimmed string or `null` (to clear the field); absent leaves it untouched. */
const nullableString = z.string().trim().nullable().optional()

const profileSchema = z.strictObject({
  orgSlug: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  short_name: nullableString,
  doing_business_as: nullableString,
  business_type: nullableString,
  industry: nullableString,
  registration_number: nullableString,
  tax_id: nullableString,
  trn: nullableString,
  gct_number: nullableString,
  nis_number: nullableString,
  incorporation_date: nullableString,
  address_line1: nullableString,
  address_line2: nullableString,
  city: nullableString,
  region_id: nullableString,
  country_code: nullableString,
  primary_phone: nullableString,
  primary_email: nullableString,
  fax: nullableString,
  website_url: nullableString,
  currency_code: nullableString,
  timezone: nullableString,
  language: nullableString,
})

/**
 * Updates the caller's organization identity profile. Authorizes owner/admin
 * against the resolved manage context, then writes through the platform client
 * to the identity API — the source of truth that propagates to billing and
 * every other 876 surface. Pure transport: no business logic here.
 */
export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid organization profile.' }, { status: 422 })
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid organization profile.' }, { status: 422 })

  const { orgSlug, ...fields } = parsed.data

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      {
        error: 'You do not have permission to edit the organization profile.',
      },
      { status: 403, code: 'auth/forbidden' }
    )

  const platform = await getPlatformClient()
  const result = await platform.orgs.updateProfile(
    ctx.orgId,
    fields as PlatformOrgProfileUpdateParams
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: 502, code: result.error.code }
    )

  return apiJson({ data: result.data })
}
