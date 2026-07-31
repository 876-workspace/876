import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { getPlatformClient } from '@/lib/876/platform-client'

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
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const platform = await getPlatformClient()
  const { data, error } = await platform.countries.list()

  if (error)
    return apiJson(
      { error: 'Country information could not be loaded.' },
      { status: 503 }
    )

  return apiJson({ data })
}
