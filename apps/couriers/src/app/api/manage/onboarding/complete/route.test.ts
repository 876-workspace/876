import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  submit: vi.fn(),
  retrieve: vi.fn(),
  provision: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/service', () => ({
  service: {
    tenants: {
      create: mocks.createTenant,
      update: mocks.updateTenant,
    },
  },
}))

import { POST } from './route'

describe('Couriers onboarding completion route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'organization_123',
      role: 'owner',
      accessStatus: 'active',
      tenant: null,
    })
    mocks.getPlatformClient.mockResolvedValue({
      onboarding: { submit: mocks.submit, retrieve: mocks.retrieve },
      orgs: { subscriptions: { provision: mocks.provision } },
    })
    mocks.submit.mockResolvedValue({ data: {}, error: null })
    mocks.retrieve.mockResolvedValue({
      data: { answers: { platform_name: 'Montego Couriers' } },
      error: null,
    })
    mocks.provision.mockResolvedValue({ data: {}, error: null })
    mocks.createTenant.mockResolvedValue({
      data: { id: 'tenant_123' },
      error: null,
    })
    mocks.updateTenant.mockResolvedValue({ data: {}, error: null })
  })

  it.each([undefined, null, '', '   ', 42])(
    'requires a platform name when the answer is %s',
    async (value) => {
      mocks.retrieve.mockResolvedValue({
        data: { answers: { platform_name: value } },
        error: null,
      })

      const response = await POST()
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.message).toBe(
        'Provide your platform name in the setup step.'
      )
      expect(mocks.provision).not.toHaveBeenCalled()
      expect(mocks.createTenant).not.toHaveBeenCalled()
    }
  )
})
