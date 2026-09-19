import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  getFeatures: vi.fn(),
  resolvePlatformAppId: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T>(fn: T) => fn }
})
vi.mock('@/lib/clients/account', () => ({
  getAccount: async () => ({
    appMemberships: { me: { retrieve: mocks.retrieve } },
  }),
}))
vi.mock('@/lib/features', () => ({ getFeatures: mocks.getFeatures }))
vi.mock('@/lib/clients/platform-app', () => ({
  resolvePlatformAppId: mocks.resolvePlatformAppId,
}))

const { canAccess, hasAccessFeature, resolveAccessContext } =
  await import('./access-context')

function membership(overrides: Record<string, unknown> = {}) {
  return {
    status: 'active',
    assigned: true,
    entitled: true,
    revoked_at: null,
    effective_permissions: ['requests.view', 'customers.view'],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolvePlatformAppId.mockResolvedValue('rap_crm')
  mocks.getFeatures.mockResolvedValue({
    uiFeatures: {
      searchBar: false,
      themeSwitcher: false,
      globalAdd: false,
      appSwitcher: false,
      orgSwitcher: false,
    },
  })
})

describe('CRM access context', () => {
  it('uses effective permissions unchanged', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    await expect(
      resolveAccessContext('user_1', 'org_1')
    ).resolves.toMatchObject({
      status: 'ok',
      context: { permissions: ['requests.view', 'customers.view'] },
    })
  })
  it('uses the self-scoped membership endpoint with exact arguments', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    await resolveAccessContext('user_2', 'org_2')
    expect(mocks.retrieve).toHaveBeenCalledWith({
      organizationId: 'org_2',
      appId: 'rap_crm',
    })
  })
  it('reports an unresolved platform app id as unavailable without asking for a membership', async () => {
    // Regression: the app id was hard-coded as `app_876-<slug>` while real ids
    // are generated per environment, so every request 404'd and every member
    // was told access could not be verified.
    mocks.resolvePlatformAppId.mockResolvedValue(null)

    await expect(resolveAccessContext('user_x', 'org_x')).resolves.toEqual({
      status: 'unavailable',
      code: 'platform/app-unresolved',
    })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })

  it('resolves the platform app id from the organization entitlement', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })

    await resolveAccessContext('user_y', 'org_y')

    expect(mocks.resolvePlatformAppId).toHaveBeenCalledTimes(1)
    expect(mocks.resolvePlatformAppId).toHaveBeenCalledWith('org_y')
  })

  it('reports an endpoint error as unavailable', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'platform/down' },
    })
    await expect(resolveAccessContext('user_3', 'org_3')).resolves.toEqual({
      status: 'unavailable',
      code: 'platform/down',
    })
  })
  it('reports an empty endpoint result as unavailable', async () => {
    mocks.retrieve.mockResolvedValue({ data: null, error: null })
    await expect(resolveAccessContext('user_4', 'org_4')).resolves.toEqual({
      status: 'unavailable',
      code: 'platform/unavailable',
    })
  })
  it('fails closed for an inactive membership', async () => {
    mocks.retrieve.mockResolvedValue({
      data: membership({ status: 'inactive' }),
      error: null,
    })
    await expect(
      resolveAccessContext('user_5', 'org_5')
    ).resolves.toMatchObject({ status: 'ok', context: { permissions: [] } })
  })
  it('fails closed for a revoked membership', async () => {
    mocks.retrieve.mockResolvedValue({
      data: membership({ revoked_at: 1 }),
      error: null,
    })
    await expect(
      resolveAccessContext('user_6', 'org_6')
    ).resolves.toMatchObject({ status: 'ok', context: { permissions: [] } })
  })
  it('keeps permissions when feature resolution fails', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    mocks.getFeatures.mockRejectedValue(new Error('feature provider down'))
    await expect(
      resolveAccessContext('user_7', 'org_7')
    ).resolves.toMatchObject({
      status: 'ok',
      context: {
        permissions: ['requests.view', 'customers.view'],
        features: [],
      },
    })
  })
  it('maps enabled app features into the context', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    mocks.getFeatures.mockResolvedValue({
      uiFeatures: {
        searchBar: true,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
      },
    })
    await expect(
      resolveAccessContext('user_8', 'org_8')
    ).resolves.toMatchObject({
      status: 'ok',
      context: { features: ['crm-search-bar'] },
    })
  })
  it('keeps experiments empty', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    await expect(
      resolveAccessContext('user_9', 'org_9')
    ).resolves.toMatchObject({ status: 'ok', context: { experiments: {} } })
  })
  it('answers permission and feature helpers without fetching', async () => {
    mocks.retrieve.mockResolvedValue({ data: membership(), error: null })
    const result = await resolveAccessContext('user_10', 'org_10')
    if (result.status !== 'ok') throw new Error('Expected access context')
    expect(canAccess(result.context, 'requests.view')).toBe(true)
    expect(hasAccessFeature(result.context, 'crm-search-bar')).toBe(false)
  })
})
