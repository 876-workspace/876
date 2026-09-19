import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

import {
  createPortalCouriersClient,
  toPortalTenantView,
  type PortalTenantView,
} from './client'

export const getPortalTenant = cache(
  async function getPortalTenant(): Promise<PortalTenantView | null> {
    const requestHeaders = await headers()
    const hostname = normalizeHostname(
      requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
    )

    if (hostname) {
      const domainTenant = await resolvePortalTenant({ hostname })
      if (domainTenant) return domainTenant

      const baseDomain = normalizeBaseDomain(process.env.PORTAL_BASE_DOMAIN)

      if (baseDomain) {
        const suffix = `.${baseDomain}`
        if (hostname.endsWith(suffix)) {
          const slug = hostname.slice(0, -suffix.length).split('.')[0]
          const tenant = slug ? await resolvePortalTenant({ slug }) : null
          if (tenant) return tenant
        }
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

/**
 * The portal base domain is deployment configuration: when it is unset or
 * blank, subdomain tenant resolution is skipped rather than pointed at a
 * guessed domain (.agents/rules/env-configuration.md rule 4).
 */
function normalizeBaseDomain(value: string | undefined): string | null {
  const host = value?.trim().toLowerCase()
  if (!host) return null
  const domain = host.replace(/^\.+|\.+$/g, '')
  if (!domain) return null
  return domain
}
