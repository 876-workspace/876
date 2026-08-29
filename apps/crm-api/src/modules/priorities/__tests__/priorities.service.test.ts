import { expectValue } from '../../../test/expect-value.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieveTenant: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveActive: vi.fn(),
  retrieveDefault: vi.fn(),
  retrieveByProvisioningKey: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setDefault: vi.fn(),
  isReferenced: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../../tenants/tenants.service.js', () => ({
  retrieveByOrganization: mocks.retrieveTenant,
}))

vi.mock('../priorities.repository.js', () => ({
  list: mocks.list,
  retrieve: mocks.retrieve,
  retrieveActive: mocks.retrieveActive,
  retrieveDefault: mocks.retrieveDefault,
  retrieveByProvisioningKey: mocks.retrieveByProvisioningKey,
  create: mocks.create,
  update: mocks.update,
  setDefault: mocks.setDefault,
  isReferenced: mocks.isReferenced,
  remove: mocks.remove,
}))

import * as service from '../priorities.service.js'

const tenant = {
  id: 'crm_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

function priority(overrides: Record<string, unknown> = {}) {
  return {
    id: 'crm_pri_1',
    tenantId: tenant.id,
    provisioningKey: null,
    name: 'Normal',
    slug: 'normal',
    description: null,
    color: null,
    icon: null,
    weight: 20,
    sortOrder: 20,
    isDefault: true,
    isActive: true,
    createdBy: 'usr_1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieveTenant.mockResolvedValue(tenant)
  mocks.retrieveDefault.mockResolvedValue(priority())
  mocks.isReferenced.mockResolvedValue(false)
})

describe('request priority service', () => {
  it('serializes a tenant priority resource', () => {
    expect(service.serialize(priority())).toMatchObject({
      object: 'request_priority',
      id: 'crm_pri_1',
      tenantId: tenant.id,
      name: 'Normal',
      weight: 20,
      isDefault: true,
      createdAt: 1_767_225_600,
    })
  })

  it('fails closed when the organization has no CRM tenant', async () => {
    mocks.retrieveTenant.mockResolvedValue(null)

    await expect(service.list('missing-org')).resolves.toMatchObject({
      code: 'crm/tenant-not-found',
    })
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('creates a slugged custom priority without a provisioning key', async () => {
    const created = priority({
      id: 'crm_pri_critical',
      name: 'Critical / Immediate',
      slug: 'critical-immediate',
      isDefault: false,
      weight: 50,
      sortOrder: 50,
    })
    mocks.create.mockResolvedValue(created)

    const result = expectValue(
      await service.create('org_1', {
        name: 'Critical / Immediate',
        weight: 50,
        sortOrder: 50,
        createdBy: 'usr_1',
      })
    )

    expect(mocks.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      name: 'Critical / Immediate',
      slug: 'critical-immediate',
      description: null,
      color: null,
      icon: null,
      weight: 50,
      sortOrder: 50,
      isDefault: false,
      isActive: true,
      createdBy: 'usr_1',
    })
    expect(result.id).toBe('crm_pri_critical')
  })

  it('promotes the first active custom priority when no default exists', async () => {
    const created = priority({ id: 'crm_pri_first', isDefault: false })
    const promoted = priority({ id: 'crm_pri_first', isDefault: true })
    mocks.retrieveDefault.mockResolvedValue(null)
    mocks.create.mockResolvedValue(created)
    mocks.setDefault.mockResolvedValue(promoted)

    const result = expectValue(
      await service.create('org_1', {
        name: 'First',
        createdBy: 'usr_1',
      })
    )

    expect(mocks.setDefault).toHaveBeenCalledWith(tenant.id, 'crm_pri_first')
    expect(result.isDefault).toBe(true)
  })

  it('does not allow the active default priority to be demoted or archived', async () => {
    mocks.retrieve.mockResolvedValue(priority())

    await expect(
      service.update('org_1', 'crm_pri_1', { isActive: false })
    ).resolves.toMatchObject({ code: 'crm/priority-default-required' })
    await expect(
      service.update('org_1', 'crm_pri_1', { isDefault: false })
    ).resolves.toMatchObject({ code: 'crm/priority-default-required' })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('moves the default transactionally through the repository helper', async () => {
    const current = priority({
      id: 'crm_pri_high',
      name: 'High',
      slug: 'high',
      isDefault: false,
    })
    const updated = { ...current, name: 'Critical', slug: 'critical' }
    const promoted = { ...updated, isDefault: true }
    mocks.retrieve.mockResolvedValue(current)
    mocks.update.mockResolvedValue(updated)
    mocks.setDefault.mockResolvedValue(promoted)

    const result = expectValue(
      await service.update('org_1', current.id, {
        name: 'Critical',
        isDefault: true,
      })
    )

    expect(mocks.update).toHaveBeenCalledWith(current.id, {
      name: 'Critical',
      slug: 'critical',
      isDefault: false,
    })
    expect(mocks.setDefault).toHaveBeenCalledWith(tenant.id, current.id)
    expect(result?.isDefault).toBe(true)
  })

  it('blocks deletion of default and referenced priorities', async () => {
    mocks.retrieve.mockResolvedValue(priority())
    await expect(
      service.remove('org_1', 'crm_pri_1', { deletedBy: 'usr_1' })
    ).resolves.toMatchObject({ code: 'crm/priority-default-required' })

    mocks.retrieve.mockResolvedValue(priority({ isDefault: false }))
    mocks.isReferenced.mockResolvedValue(true)
    await expect(
      service.remove('org_1', 'crm_pri_1', { deletedBy: 'usr_1' })
    ).resolves.toMatchObject({ code: 'crm/priority-in-use' })
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('requires an active priority for new routing selections', async () => {
    mocks.retrieveActive.mockResolvedValue(null)

    await expect(
      service.requireActiveForTenant(tenant.id, 'crm_pri_archived')
    ).resolves.toMatchObject({ code: 'crm/priority-not-found' })
  })

  it('preserves tenant overrides when a provisioned key already exists', async () => {
    const customized = priority({
      provisioningKey: 'urgent',
      name: 'Emergency',
      slug: 'emergency',
      color: '#dc2626',
      isDefault: false,
    })
    mocks.retrieveByProvisioningKey.mockResolvedValue(customized)

    const result = expectValue(
      await service.ensureProvisioned(tenant.id, {
        provisioningKey: 'urgent',
        name: 'Urgent',
        description: null,
        color: null,
        icon: null,
        weight: 40,
        sortOrder: 40,
        isDefault: false,
      })
    )

    expect(result).toBe(customized)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('creates a missing provisioned priority and only assigns its default when none exists', async () => {
    const created = priority({
      id: 'crm_pri_normal',
      provisioningKey: 'normal',
      createdBy: null,
      isDefault: false,
    })
    const promoted = { ...created, isDefault: true }
    mocks.retrieveByProvisioningKey.mockResolvedValue(null)
    mocks.retrieveDefault.mockResolvedValue(null)
    mocks.create.mockResolvedValue(created)
    mocks.setDefault.mockResolvedValue(promoted)

    const result = expectValue(
      await service.ensureProvisioned(tenant.id, {
        provisioningKey: 'normal',
        name: 'Normal',
        description: null,
        color: null,
        icon: null,
        weight: 20,
        sortOrder: 20,
        isDefault: true,
      })
    )

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        provisioningKey: 'normal',
        name: 'Normal',
        isDefault: false,
        createdBy: null,
      })
    )
    expect(mocks.setDefault).toHaveBeenCalledWith(tenant.id, created.id)
    expect(result.isDefault).toBe(true)
  })
})
