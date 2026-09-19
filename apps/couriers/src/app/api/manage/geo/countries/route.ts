import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getPlatformClient } from '@/lib/clients/platform'

export const runtime = 'nodejs'

/**
 * Pure transport for the platform country catalog.
 *
 * The address form needs the catalog in the browser, but the platform client is
 * server-only and authenticates with the secret internal key — this route is
 * the boundary that keeps that key server-side.
 */
export async function GET() {
  const ctx = await getManageContext()
  if (!ctx) return errorResponse('auth/no-session')

  const platform = await getPlatformClient()
  const { data, error } = await platform.countries.list()

  if (error) return errorResponse('address/geography-unavailable')

  return apiJson({ data })
}
