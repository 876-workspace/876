import { apiJson } from '@876/core/api'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getPortalTenant } from '@/lib/portal/tenant'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const tenant = await getPortalTenant()
  if (!tenant) return apiJson({ error: 'Portal unavailable.' }, { status: 404 })

  try {
    const profile = await service.customerProfiles.retrieveByTenantAndUser(
      tenant.id,
      session.user.id
    )
    if (!profile)
      return apiJson(
        { error: 'Portal enrollment is required.' },
        { status: 403 }
      )

    const packages = await service.packages.list({
      tenantId: tenant.id,
      customerId: profile.id,
    })

    return apiJson({ data: packages })
  } catch (error) {
    console.error('[portal.packages]', error)
    return apiJson({ error: 'Failed to load packages.' }, { status: 500 })
  }
}
