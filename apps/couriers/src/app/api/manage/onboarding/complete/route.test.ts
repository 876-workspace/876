import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  submit: vi.fn(),
  retrieve: vi.fn(),
  provision: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  couriersErrorStatus: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: {
    tenants: {
      create: mocks.createTenant,
      update: mocks.updateTenant,
    },
  },
}))
vi.mock('@/lib/couriers', () => ({
  couriersErrorStatus: mocks.couriersErrorStatus,
}))

import { POST } from './route'

describe('Couriers onboarding completion route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      userId: 'user_123',
      orgId: 'organization_123',
      role: 'owner',
      accessStatus: 'active',
      tenant: null,
    })
    mocks.getPlatformClient.mockResolvedValue({
      onboarding: { submit: mocks.submit, retrieve: mocks.retrieve },
      subscriptions: { create: mocks.provision },
    })
    mocks.submit.mockResolvedValue({ data: {}, error: null })
    mocks.retrieve.mockResolvedValue({
      data: { answers: { platform_name: 'Montego Couriers' } },
      error: null,
    })
    mocks.provision.mockResolvedValue({
      data: { status: 'active' },
      error: null,
    })
    mocks.createTenant.mockResolvedValue({
      data: { id: 'tenant_123' },
      error: null,
    })
    mocks.updateTenant.mockResolvedValue({ data: {}, error: null })
    mocks.couriersErrorStatus.mockReturnValue(502)
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

  it('provisions the Couriers tenant and applies the selected mailbox prefix', async () => {
    mocks.retrieve.mockResolvedValue({
      data: {
        answers: {
          platform_name: 'Montego Couriers',
          mailbox_prefix: 'mbj',
        },
      },
      error: null,
    })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.createTenant).toHaveBeenCalledWith({
      org_id: 'organization_123',
      name: 'Montego Couriers',
      slug: 'montego-couriers',
      owner_user_id: 'user_123',
    })
    expect(mocks.updateTenant).toHaveBeenCalledWith('tenant_123', {
      mailbox_prefix: 'MBJ',
    })
    await expect(response.json()).resolves.toEqual({
      data: {
        object: 'onboarding_completion',
        tenant_id: 'tenant_123',
        access_status: 'active',
      },
      error: null,
    })
  })
})
