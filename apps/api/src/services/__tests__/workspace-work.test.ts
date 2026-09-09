import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  findAppBySlug: vi.fn(),
  listSubscribedAppIds: vi.fn(),
  requirePersistedProvisioningPolicy: vi.fn(),
  isProvisionedWorkEnabled: vi.fn(),
  workScopesForProvisionedApp: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/config', () => ({ getSettings: mocks.getSettings }))
vi.mock('../provisioning.repository', () => ({
  findAppBySlug: mocks.findAppBySlug,
  listSubscribedAppIds: mocks.listSubscribedAppIds,
}))
vi.mock('../provisioning-policy', () => ({
  requirePersistedProvisioningPolicy: mocks.requirePersistedProvisioningPolicy,
  isProvisionedWorkEnabled: mocks.isProvisionedWorkEnabled,
  workScopesForProvisionedApp: mocks.workScopesForProvisionedApp,
}))
vi.mock('@/platform/logger', () => ({
  getLogger: () => ({
    info: mocks.info,
    warn: mocks.warn,
    error: mocks.error,
  }),
}))

import { workspace } from '../workspace'

const fetchMock = vi.fn()

const DEFAULT_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
  'work.reminders.read',
  'work.reminders.write',
  'work.calendars.read',
  'work.calendars.write',
  'work.events.read',
  'work.events.write',
  'work.alerts.read',
  'work.alerts.write',
  'work.my-work.read',
  'work.resource-work.read',
] as const

function settings(overrides: { url?: string; internalKey?: string } = {}) {
  return {
    work: {
      url: overrides.url ?? 'https://work.example.test',
      internalKey: overrides.internalKey ?? 'work-internal-key',
    },
  }
}

function selectedPolicy() {
  return {
    selection: {
      setup_key: 'jamaica',
      selection_type: 'policy',
      match_group_key: 'jm',
      match_priority: 50,
      matched_fields: ['country'],
      selected_at: 1,
    },
    policy: {
      object: 'provisioning_setup_policy',
      setup_id: 'setup_1',
      setup_key: 'jamaica',
      conditions: [],
      entitlements: [],
      updated_at: 1,
    },
  }
}

function workTenantResponse() {
  return new Response(
    JSON.stringify({
      data: {
        object: 'work_tenant',
        id: 'work_tnt_1',
        organizationId: 'org_1',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

function workErrorResponse() {
  return new Response(
    JSON.stringify({
      data: null,
      error: { code: 'work/tenant-unavailable', message: 'Unavailable.' },
    }),
    { status: 503, headers: { 'content-type': 'application/json' } }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  mocks.getSettings.mockReturnValue(settings())
  mocks.findAppBySlug.mockResolvedValue({ id: 'app_crm', slug: '876-crm' })
  mocks.listSubscribedAppIds.mockResolvedValue(['app_crm'])
  mocks.requirePersistedProvisioningPolicy.mockResolvedValue(selectedPolicy())
  mocks.isProvisionedWorkEnabled.mockReturnValue(true)
  mocks.workScopesForProvisionedApp.mockReturnValue([...DEFAULT_SCOPES])
  fetchMock.mockImplementation(() => Promise.resolve(workTenantResponse()))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('workspace.work.ensure', () => {
  it('requires the persisted setup before reading Work configuration', async () => {
    // ARRANGE
    const missing = new AppHttpError({
      code: 'provisioning/setup-selection-missing',
      message: 'The organization has no persisted provisioning setup.',
      httpStatus: 409,
    })
    mocks.requirePersistedProvisioningPolicy.mockRejectedValue(missing)

    // ACT
    const act = workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    await expect(act).rejects.toBe(missing)
    expect(mocks.getSettings).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does nothing when the selected setup disables Work', async () => {
    // ARRANGE
    mocks.isProvisionedWorkEnabled.mockReturnValue(false)

    // ACT
    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    expect(mocks.getSettings).not.toHaveBeenCalled()
    expect(mocks.findAppBySlug).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.info).toHaveBeenCalledWith(
      { organization_id: 'org_1', setup_key: 'jamaica' },
      'work_provisioning.disabled_by_setup'
    )
  })

  it('creates the organization Work tenant before its CRM connection', async () => {
    // ARRANGE
    const params = { organizationId: 'org_1', appIds: ['app_crm'] }

    // ACT
    await workspace.work.ensure(params)

    // ASSERT
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://work.example.test/v1/tenants',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'work-internal-key',
        },
        body: JSON.stringify({ organizationId: 'org_1' }),
      }
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://work.example.test/v1/tenants',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'work-internal-key',
        },
        body: JSON.stringify({
          organizationId: 'org_1',
          appId: 'app_crm',
          scopes: [...DEFAULT_SCOPES],
        }),
      }
    )
    expect(mocks.workScopesForProvisionedApp).toHaveBeenCalledTimes(1)
    expect(mocks.workScopesForProvisionedApp).toHaveBeenCalledWith(
      '876-crm',
      selectedPolicy().policy
    )
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('creates a Work tenant without an app connection when no Work-dependent app is subscribed', async () => {
    // ARRANGE
    const params = { organizationId: 'org_1', appIds: ['app_enterprise'] }

    // ACT
    await workspace.work.ensure(params)

    // ASSERT
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/tenants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ organizationId: 'org_1' }),
      })
    )
    expect(mocks.findAppBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.workScopesForProvisionedApp).not.toHaveBeenCalled()
  })

  it.each([
    ['URL', settings({ url: '' })],
    ['internal key', settings({ internalKey: '' })],
  ])('fails closed when the Work %s is unconfigured', async (_label, value) => {
    // ARRANGE
    mocks.getSettings.mockReturnValue(value)

    // ACT
    const act = workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    await expect(act).rejects.toMatchObject({
      code: 'provisioning/work-workspace-unavailable',
      httpStatus: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.findAppBySlug).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org_1' }),
      'work_provisioning.not_configured'
    )
  })

  it('fails before app lookup when tenant creation returns a Work error', async () => {
    // ARRANGE
    fetchMock.mockResolvedValue(workErrorResponse())

    // ACT
    const act = workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    await expect(act).rejects.toMatchObject({
      code: 'provisioning/work-workspace-unavailable',
      httpStatus: 503,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mocks.findAppBySlug).not.toHaveBeenCalled()
  })

  it('normalizes a network failure while creating the tenant', async () => {
    // ARRANGE
    fetchMock.mockRejectedValue(new Error('network down'))

    // ACT
    const act = workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    await expect(act).rejects.toMatchObject({
      code: 'provisioning/work-workspace-unavailable',
      httpStatus: 503,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(mocks.findAppBySlug).not.toHaveBeenCalled()
  })

  it('skips a missing Work-dependent app after ensuring the tenant', async () => {
    // ARRANGE
    mocks.findAppBySlug.mockResolvedValue(null)

    // ACT
    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mocks.workScopesForProvisionedApp).not.toHaveBeenCalled()
  })

  it('skips the app connection when provisioning enables no scopes for that app', async () => {
    // ARRANGE
    mocks.workScopesForProvisionedApp.mockReturnValue([])

    // ACT
    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mocks.info).toHaveBeenCalledWith(
      {
        organization_id: 'org_1',
        app_slug: '876-crm',
        setup_key: 'jamaica',
      },
      'work_provisioning.no_enabled_capabilities'
    )
  })

  it('fails when the app connection cannot be prepared', async () => {
    // ARRANGE
    fetchMock
      .mockResolvedValueOnce(workTenantResponse())
      .mockResolvedValueOnce(workErrorResponse())

    // ACT
    const act = workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    // ASSERT
    await expect(act).rejects.toMatchObject({
      code: 'provisioning/work-workspace-unavailable',
      httpStatus: 503,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('replays both idempotent Work ensure operations on retry', async () => {
    // ARRANGE
    const params = { organizationId: 'org_1', appIds: ['app_crm'] }

    // ACT
    await workspace.work.ensure(params)
    await workspace.work.ensure(params)

    // ASSERT
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(mocks.requirePersistedProvisioningPolicy).toHaveBeenCalledTimes(2)
  })
})
