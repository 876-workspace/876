import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Domain, Tenant } from '@/lib/db'

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  retrieveByHostname: vi.fn(),
  retrieveBySlug: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('react', () => ({ cache: (callback: unknown) => callback }))
vi.mock('@/lib/service', () => ({
  service: {
    tenants: {
      retrieveByHostname: mocks.retrieveByHostname,
      retrieveBySlug: mocks.retrieveBySlug,
    },
  },
}))

import { getPortalTenant } from './tenant'

type DomainWithTenant = Domain & { tenant: Tenant }

const HOSTNAME_SECURITY_CASES = [
  ['external URL', 'https://evil.com', 'https://evil.com'],
  ['protocol-relative URL', '//evil.com', '//evil.com'],
  ['javascript URL', 'javascript:alert(1)', 'javascript:alert(1)'],
  ['path traversal', '/portal/../admin', '/portal/../admin'],
  ['empty string', '', null],
  ['whitespace-only string', '  \t ', null],
  ['XSS payload', '<script>alert(1)</script>', '<script>alert(1)</script>'],
  ['SQL injection', "' OR '1'='1", "' or '1'='1"],
  ['prototype key', '__proto__', '__proto__'],
  ['null byte', '\u0000', '\u0000'],
  ['10k characters', 'a'.repeat(10_000), 'a'.repeat(10_000)],
] as const

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'ten_rocketship',
    orgId: 'org_rocketship',
    slug: 'rocketship',
    name: 'Rocketship Couriers Jamaica',
    mailboxPrefix: 'RSJ',
    status: 'ACTIVE',
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createDomain(
  overrides: Partial<DomainWithTenant> = {}
): DomainWithTenant {
  const tenant = createTenant()

  return {
    id: 'dom_rocketship',
    tenantId: tenant.id,
    hostname: 'portal.rocketshipja.com',
    isPrimary: true,
    verified: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    tenant,
    ...overrides,
  }
}

function createRequestHeaders(
  values: Record<string, string>
): Pick<Headers, 'get'> {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null
    },
  }
}

describe('getPortalTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PORTAL_BASE_DOMAIN', '')
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', '')
    mocks.headers.mockResolvedValue(new Headers())
    mocks.retrieveByHostname.mockResolvedValue(null)
    mocks.retrieveBySlug.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the active tenant for a verified custom domain', async () => {
    const tenant = createTenant()
    const domain = createDomain({ tenant })
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'portal.rocketshipja.com' })
    )
    mocks.retrieveByHostname.mockResolvedValue(domain)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.headers).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'portal.rocketshipja.com'
    )
    expect(mocks.retrieveBySlug).not.toHaveBeenCalled()
  })

  it('rejects an unverified domain and falls back to the base-domain slug', async () => {
    const tenant = createTenant()
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'rocketship.couriers.876.app' })
    )
    mocks.retrieveByHostname.mockResolvedValue(
      createDomain({
        hostname: 'rocketship.couriers.876.app',
        verified: false,
        tenant,
      })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'rocketship.couriers.876.app'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it.each(['SUSPENDED', 'PENDING'] as const)(
    'rejects a verified custom domain whose tenant is %s',
    async (status) => {
      const tenant = createTenant({ status })
      mocks.headers.mockResolvedValue(
        new Headers({ host: 'portal.rocketshipja.com' })
      )
      mocks.retrieveByHostname.mockResolvedValue(
        createDomain({ tenant, verified: true })
      )

      const result = await getPortalTenant()

      expect(result).toBeNull()
      expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
        'portal.rocketshipja.com'
      )
      expect(mocks.retrieveBySlug).not.toHaveBeenCalled()
    }
  )

  it.each(['SUSPENDED', 'PENDING'] as const)(
    'returns null when the slug resolves to a %s tenant',
    async (status) => {
      const tenant = createTenant({ status })
      mocks.headers.mockResolvedValue(
        new Headers({ host: 'rocketship.couriers.876.app' })
      )
      mocks.retrieveBySlug.mockResolvedValue(tenant)

      const result = await getPortalTenant()

      expect(result).toBeNull()
      expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
        'rocketship.couriers.876.app'
      )
      expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
    }
  )

  it('strips a numeric port before tenant lookups', async () => {
    const tenant = createTenant()
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'rocketship.couriers.876.app:3003' })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'rocketship.couriers.876.app'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it('lowercases an uppercase hostname before tenant lookups', async () => {
    const tenant = createTenant()
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'ROCKETSHIP.COURIERS.876.APP' })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'rocketship.couriers.876.app'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it('uses only the first forwarded hostname from a comma list', async () => {
    const tenant = createTenant()
    mocks.headers.mockResolvedValue(
      new Headers({
        host: 'ignored.couriers.876.app',
        'x-forwarded-host':
          '  ROCKETSHIP.COURIERS.876.APP:443, proxy.internal:3003',
      })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'rocketship.couriers.876.app'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it('uses the leftmost label for a multi-label base-domain subdomain', async () => {
    const tenant = createTenant({ id: 'ten_a', slug: 'a', mailboxPrefix: 'A' })
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'a.b.couriers.876.app' })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'a.b.couriers.876.app'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('a')
  })

  it('normalizes and applies a custom portal base domain', async () => {
    const tenant = createTenant()
    vi.stubEnv('PORTAL_BASE_DOMAIN', ' .Portal.Rocketship.JM. ')
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'rocketship.portal.rocketship.jm' })
    )
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
      'rocketship.portal.rocketship.jm'
    )
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it('uses the development tenant override in the test environment', async () => {
    const tenant = createTenant()
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', '  rocketship  ')
    mocks.retrieveBySlug.mockResolvedValue(tenant)

    const result = await getPortalTenant()

    expect(result).toEqual(tenant)
    expect(mocks.retrieveByHostname).not.toHaveBeenCalled()
    expect(mocks.retrieveBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveBySlug).toHaveBeenCalledWith('rocketship')
  })

  it('ignores the development tenant override in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', 'rocketship')

    const result = await getPortalTenant()

    expect(result).toBeNull()
    expect(mocks.retrieveByHostname).not.toHaveBeenCalled()
    expect(mocks.retrieveBySlug).not.toHaveBeenCalled()
  })

  it('returns null without tenant lookups when no host headers exist', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const result = await getPortalTenant()

    expect(result).toBeNull()
    expect(mocks.headers).toHaveBeenCalledTimes(1)
    expect(mocks.headers).toHaveBeenCalledWith()
    expect(mocks.retrieveByHostname).not.toHaveBeenCalled()
    expect(mocks.retrieveBySlug).not.toHaveBeenCalled()
  })

  it.each(HOSTNAME_SECURITY_CASES)(
    'handles the %s hostname deterministically',
    async (_case, hostname, normalizedHostname) => {
      vi.stubEnv('NODE_ENV', 'production')
      mocks.headers.mockResolvedValue(
        createRequestHeaders({ 'x-forwarded-host': hostname })
      )

      const result = await getPortalTenant()

      expect(result).toBeNull()
      expect(mocks.headers).toHaveBeenCalledTimes(1)
      if (normalizedHostname === null) {
        expect(mocks.retrieveByHostname).not.toHaveBeenCalled()
      } else {
        expect(mocks.retrieveByHostname).toHaveBeenCalledTimes(1)
        expect(mocks.retrieveByHostname).toHaveBeenCalledWith(
          normalizedHostname
        )
      }
      expect(mocks.retrieveBySlug).not.toHaveBeenCalled()
    }
  )
})
