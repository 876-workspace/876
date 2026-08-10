import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ headers: vi.fn(), resolve: vi.fn() }))

vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('react', () => ({ cache: (callback: unknown) => callback }))
vi.mock('./client', () => ({
  createPortalCouriersClient: () => ({
    portal: { tenants: { resolve: mocks.resolve } },
  }),
  toPortalTenantView: (tenant: Record<string, unknown>) => ({
    id: tenant.id,
    orgId: tenant.org_id,
    slug: tenant.slug,
    name: tenant.name,
    mailboxPrefix: tenant.mailbox_prefix,
    status: tenant.status,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  }),
}))

import { getPortalTenant } from './tenant'

const wireTenant = {
  object: 'tenant' as const,
  id: 'ten_rocketship',
  org_id: 'org_rocketship',
  slug: 'rocketship',
  name: 'Rocketship Couriers Jamaica',
  mailbox_prefix: 'RSJ',
  status: 'ACTIVE' as const,
  created_at: 1_784_419_200,
  updated_at: 1_784_419_200,
}

const tenant = {
  id: wireTenant.id,
  orgId: wireTenant.org_id,
  slug: wireTenant.slug,
  name: wireTenant.name,
  mailboxPrefix: wireTenant.mailbox_prefix,
  status: wireTenant.status,
  createdAt: wireTenant.created_at,
  updatedAt: wireTenant.updated_at,
}

function resolved(data: typeof wireTenant) {
  return { data, error: null }
}

describe('getPortalTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PORTAL_BASE_DOMAIN', '')
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', '')
    mocks.headers.mockResolvedValue(new Headers())
    mocks.resolve.mockResolvedValue({
      data: null,
      error: { code: 'tenant/not-found', message: 'Not found.' },
    })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('resolves a verified custom hostname through the api-key portal client', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'portal.rocketshipja.com' })
    )
    mocks.resolve.mockResolvedValue(resolved(wireTenant))

    await expect(getPortalTenant()).resolves.toEqual(tenant)
    expect(mocks.resolve).toHaveBeenCalledWith({
      hostname: 'portal.rocketshipja.com',
    })
  })

  it('falls back from the base-domain hostname to a tenant slug', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ host: 'rocketship.couriers.876.app' })
    )
    mocks.resolve
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'tenant/not-found', message: 'Not found.' },
      })
      .mockResolvedValueOnce(resolved(wireTenant))

    await expect(getPortalTenant()).resolves.toEqual(tenant)
    expect(mocks.resolve).toHaveBeenNthCalledWith(1, {
      hostname: 'rocketship.couriers.876.app',
    })
    expect(mocks.resolve).toHaveBeenNthCalledWith(2, { slug: 'rocketship' })
  })

  it('strips the port and lowercases a forwarded host before resolution', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-forwarded-host':
          '  ROCKETSHIP.COURIERS.876.APP:443, proxy.internal:3003',
      })
    )
    mocks.resolve
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'tenant/not-found', message: 'Not found.' },
      })
      .mockResolvedValueOnce(resolved(wireTenant))

    await expect(getPortalTenant()).resolves.toEqual(tenant)
    expect(mocks.resolve).toHaveBeenNthCalledWith(1, {
      hostname: 'rocketship.couriers.876.app',
    })
  })

  it('uses the development tenant slug only outside production', async () => {
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', '  rocketship  ')
    mocks.resolve.mockResolvedValue(resolved(wireTenant))

    await expect(getPortalTenant()).resolves.toEqual(tenant)
    expect(mocks.resolve).toHaveBeenCalledWith({ slug: 'rocketship' })
  })

  it('does not use development fallback in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PORTAL_DEV_TENANT_SLUG', 'rocketship')

    await expect(getPortalTenant()).resolves.toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
  })

  it('does not send an empty host to the resolver', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await expect(getPortalTenant()).resolves.toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
  })
})
