import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  submit: vi.fn(),
  retrieve: vi.fn(),
  provision: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  reconcileCategories: vi.fn(),
  loadProvisioning: vi.fn(),
  couriersErrorStatus: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/provisioning/manifest', () => ({
  loadCouriersProvisioningManifest: mocks.loadProvisioning,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: {
    tenants: {
      create: mocks.createTenant,
      update: mocks.updateTenant,
    },
    packageCategories: {
      reconcile: mocks.reconcileCategories,
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
      role: 'super-admin',
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
    mocks.loadProvisioning.mockResolvedValue({
      object: 'couriers_provisioning_manifest',
      revision: 7,
      packageCategories: [
        {
          key: 'electronics',
          name: 'Electronics',
          description: 'Consumer electronics and accessories.',
          icon: null,
          sortOrder: 40,
          isActive: true,
        },
      ],
    })
    mocks.createTenant.mockResolvedValue({
      data: { id: 'tenant_123' },
      error: null,
    })
    mocks.reconcileCategories.mockResolvedValue({
      data: {
        object: 'package_category_reconciliation',
        revision: 7,
        reconciled: 1,
      },
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
      expect(mocks.reconcileCategories).not.toHaveBeenCalled()
    }
  )

  it('provisions the Couriers tenant, category defaults, and mailbox prefix', async () => {
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
      creator_user_id: 'user_123',
    })
    expect(mocks.reconcileCategories).toHaveBeenCalledWith('tenant_123', {
      revision: 7,
      categories: [
        {
          key: 'electronics',
          name: 'Electronics',
          description: 'Consumer electronics and accessories.',
          icon: null,
          sort_order: 40,
          is_active: true,
        },
      ],
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

  it('reconciles defaults into an existing Couriers tenant without creating another tenant', async () => {
    mocks.getManageContext.mockResolvedValue({
      userId: 'user_123',
      orgId: 'organization_123',
      role: 'super-admin',
      accessStatus: 'active',
      tenant: { id: 'tenant_existing' },
    })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.createTenant).not.toHaveBeenCalled()
    expect(mocks.reconcileCategories).toHaveBeenCalledWith(
      'tenant_existing',
      expect.objectContaining({ revision: 7 })
    )
  })

  it('fails before tenant creation when the published provisioning manifest is unavailable', async () => {
    mocks.loadProvisioning.mockRejectedValue(new Error('missing manifest'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toEqual({
      code: 'onboarding/provisioning-unavailable',
      message: 'Workspace defaults could not be loaded. Please try again.',
    })
    expect(mocks.createTenant).not.toHaveBeenCalled()
    expect(mocks.reconcileCategories).not.toHaveBeenCalled()
  })

  it('returns a registered error when package category reconciliation fails', async () => {
    mocks.reconcileCategories.mockResolvedValue({
      data: null,
      error: {
        code: 'package-category/provisioning-key-conflict',
        message: 'That provisioned package category already exists.',
      },
    })

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toEqual({
      code: 'onboarding/provisioning-failed',
      message: 'Workspace defaults could not be applied. Please try again.',
    })
    expect(mocks.updateTenant).not.toHaveBeenCalled()
  })
})
