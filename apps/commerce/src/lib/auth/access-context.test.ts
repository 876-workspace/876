import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn }
})
vi.mock('@/lib/services/account', () => ({
  getAccount: vi.fn(async () => ({
    appMemberships: { me: { retrieve: mocks.retrieve } },
  })),
}))

const { resolveCommerceAccessContext } = await import('./access-context')

function activeMembership(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      status: 'active',
      assigned: true,
      entitled: true,
      revoked_at: null,
      entitled_modules: [],
      effective_permissions: ['dashboard.view', 'settings.view'],
      ...overrides,
    },
    error: null,
  }
}

describe('resolveCommerceAccessContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieve.mockResolvedValue(activeMembership())
  })

  it('loads the acting member through the self app-membership resource', async () => {
    await resolveCommerceAccessContext('user_1', 'org_1', 'app_commerce')

    expect(mocks.retrieve).toHaveBeenCalledWith({
      organizationId: 'org_1',
      appId: 'app_commerce',
    })
  })

  it('projects effective permissions and module entitlements into AccessContext', async () => {
    mocks.retrieve.mockResolvedValue(
      activeMembership({
        entitled_modules: ['catalog', 'orders'],
        effective_permissions: ['orders.view'],
      })
    )

    const result = await resolveCommerceAccessContext(
      'user_1',
      'org_1',
      'app_commerce'
    )

    expect(result).toEqual({
      status: 'ok',
      context: {
        subject: { userId: 'user_1' },
        modules: ['catalog', 'orders'],
        permissions: ['orders.view'],
        features: [],
        experiments: {},
      },
    })
  })

  it('fails closed when the assignment is inactive or revoked', async () => {
    mocks.retrieve.mockResolvedValue(
      activeMembership({ assigned: false, revoked_at: 1_700_000_000 })
    )

    const result = await resolveCommerceAccessContext(
      'user_1',
      'org_1',
      'app_commerce'
    )

    expect(result).toEqual({
      status: 'ok',
      context: {
        subject: { userId: 'user_1' },
        modules: [],
        permissions: [],
        features: [],
        experiments: {},
      },
    })
  })

  it('reports provider failure as unavailable instead of a denial', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable' },
    })

    const result = await resolveCommerceAccessContext(
      'user_1',
      'org_1',
      'app_commerce'
    )

    expect(result).toEqual({
      status: 'unavailable',
      code: 'platform/unavailable',
    })
  })
})
