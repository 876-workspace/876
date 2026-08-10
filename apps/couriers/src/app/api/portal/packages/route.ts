import { apiJson } from '@876/core/api'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import {
  createPortalCouriersClient,
  isPortalNotFound,
  listAllPortalPackages,
  requirePortalData,
  toPortalPackageListItem,
} from '@/lib/portal/client'
import { getPortalTenant } from '@/lib/portal/tenant'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const tenant = await getPortalTenant()
  if (!tenant) return apiJson({ error: 'Portal unavailable.' }, { status: 404 })

  try {
    const packagesResult = await listAllPortalPackages(
      createPortalCouriersClient(session.accessToken),
      tenant.id
    )
    if (isPortalNotFound(packagesResult))
      return apiJson(
        { error: 'Portal enrollment is required.' },
        { status: 403 }
      )

    const packages = requirePortalData(packagesResult).map(
      toPortalPackageListItem
    )

    return apiJson({ data: packages })
  } catch (error) {
    console.error('[portal.packages]', error)
    return apiJson({ error: 'Failed to load packages.' }, { status: 500 })
  }
}
