import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  findAppBySlug: vi.fn(),
  listSubscribedAppIds: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/config', () => ({ getSettings: mocks.getSettings }))
vi.mock('../provisioning.repository', () => ({
  findAppBySlug: mocks.findAppBySlug,
  listSubscribedAppIds: mocks.listSubscribedAppIds,
}))
vi.mock('@/platform/logger', () => ({
  getLogger: () => ({ warn: mocks.warn, error: mocks.error }),
}))

import { workspace } from '../workspace'

const fetchMock = vi.fn()

function settings(overrides: { url?: string; internalKey?: string } = {}) {
  return {
    work: {
      url: overrides.url ?? 'https://work.example.test',
      internalKey: overrides.internalKey ?? 'work-internal-key',
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  mocks.getSettings.mockReturnValue(settings())
  mocks.findAppBySlug.mockResolvedValue({ id: 'app_crm', slug: '876-crm' })
  mocks.listSubscribedAppIds.mockResolvedValue(['app_crm'])
  fetchMock.mockResolvedValue(workTenantResponse())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('workspace.work.ensure', () => {
  it('posts the exact Work tenant request for a Work-dependent app', async () => {
    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
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
          scopes: [
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
          ],
        }),
      }
    )
    expect(mocks.warn).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('does not post for an app outside the Work-dependent scope', async () => {
    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_enterprise'],
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it.each([
    ['URL', settings({ url: '' })],
    ['internal key', settings({ internalKey: '' })],
  ])('skips and warns when the Work %s is unconfigured', async (_, value) => {
    mocks.getSettings.mockReturnValue(value)

    await expect(
      workspace.work.ensure({ organizationId: 'org_1', appIds: ['app_crm'] })
    ).resolves.toBeUndefined()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.findAppBySlug).not.toHaveBeenCalled()
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org_1' }),
      'work_provisioning.not_configured'
    )
  })

  it('skips a missing Work-dependent app and warns', async () => {
    mocks.findAppBySlug.mockResolvedValue(null)

    await workspace.work.ensure({
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.warn).toHaveBeenCalledWith(
      { organization_id: 'org_1', app_slug: '876-crm' },
      'work_provisioning.app_not_found'
    )
  })

  it('logs a Work error result and allows surrounding provisioning to continue', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/tenant-unavailable', message: 'Unavailable.' },
        }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(
      workspace.work.ensure({ organizationId: 'org_1', appIds: ['app_crm'] })
    ).resolves.toBeUndefined()

    expect(mocks.error).toHaveBeenCalledWith(
      {
        organization_id: 'org_1',
        app_id: 'app_crm',
        error_code: 'work/tenant-unavailable',
      },
      'work_provisioning.failed'
    )
  })

  it('logs a network rejection and does not leave an unhandled rejection', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(
      workspace.work.ensure({ organizationId: 'org_1', appIds: ['app_crm'] })
    ).resolves.toBeUndefined()

    expect(mocks.error).toHaveBeenCalledWith(
      {
        organization_id: 'org_1',
        app_id: 'app_crm',
        error_code: 'network/offline',
      },
      'work_provisioning.failed'
    )
  })

  it('posts on every idempotent activation attempt', async () => {
    const params = { organizationId: 'org_1', appIds: ['app_crm'] }

    await workspace.work.ensure(params)
    await workspace.work.ensure(params)

    expect(fetchMock).toHaveBeenCalledTimes(2)
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
          scopes: [
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
          ],
        }),
      }
    )
  })
})
