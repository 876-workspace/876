import 'server-only'

import { apiJson } from '@876/core/api'
import type { PlatformOrgProfileUpdateParams } from '@876/core/platform'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'

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
    return errorResponse('settings/invalid-profile')
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return errorResponse('settings/invalid-profile')

  const { orgSlug, ...fields } = parsed.data

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')

  const platform = await getPlatformClient()
  const result = await platform.organizations.updateProfile(
    ctx.orgId,
    fields as PlatformOrgProfileUpdateParams
  )
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data })
}
