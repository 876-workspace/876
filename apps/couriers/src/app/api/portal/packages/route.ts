import { apiJson } from '@876/core/api'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { errorResponse } from '@/lib/errors'
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
  if (!isSignedSession(session)) return errorResponse('auth/no-session')

  const tenant = await getPortalTenant()
  if (!tenant) return errorResponse('portal/unavailable')

  try {
    const packagesResult = await listAllPortalPackages(
      createPortalCouriersClient(session.accessToken),
      tenant.id
    )
    if (isPortalNotFound(packagesResult))
      return errorResponse('portal/enrollment-required')

    const packages = requirePortalData(packagesResult).map(
      toPortalPackageListItem
    )

    return apiJson({ data: packages })
  } catch (error) {
    console.error('[portal.packages]', error)
    return errorResponse('portal/packages-unavailable')
  }
}
