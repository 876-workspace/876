import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

import {
  createPortalCouriersClient,
  toPortalTenantView,
  type PortalTenantView,
} from './client'

const DEFAULT_PORTAL_BASE_DOMAIN = 'couriers.876.app'

export const getPortalTenant = cache(
  async function getPortalTenant(): Promise<PortalTenantView | null> {
    const requestHeaders = await headers()
    const hostname = normalizeHostname(
      requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
    )

    if (hostname) {
      const domainTenant = await resolvePortalTenant({ hostname })
      if (domainTenant) return domainTenant

      const baseDomain = normalizeBaseDomain(
        process.env.PORTAL_BASE_DOMAIN ?? DEFAULT_PORTAL_BASE_DOMAIN
      )
      const suffix = `.${baseDomain}`

      if (hostname.endsWith(suffix)) {
        const slug = hostname.slice(0, -suffix.length).split('.')[0]
        const tenant = slug ? await resolvePortalTenant({ slug }) : null
        if (tenant) return tenant
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const slug = process.env.PORTAL_DEV_TENANT_SLUG?.trim()
      const tenant = slug ? await resolvePortalTenant({ slug }) : null
      if (tenant) return tenant
    }

    return null
  }
)

async function resolvePortalTenant(
  params: { hostname: string } | { slug: string }
): Promise<PortalTenantView | null> {
  const result =
    await createPortalCouriersClient(undefined).portal.tenants.resolve(params)
  return result.error === null ? toPortalTenantView(result.data) : null
}

function normalizeHostname(value: string | null): string | null {
  const hostname = value?.split(',')[0]?.trim().toLowerCase()
  if (!hostname) return null

  return hostname.replace(/:\d+$/, '')
}

function normalizeBaseDomain(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/^\.+|\.+$/g, '') || DEFAULT_PORTAL_BASE_DOMAIN
  )
}
