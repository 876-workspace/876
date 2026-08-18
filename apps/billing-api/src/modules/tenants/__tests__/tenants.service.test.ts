import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeCurrencyExists: vi.fn(),
  provisionTenantRow: vi.fn(),
  archiveTenantRowForOrganization: vi.fn(),
  restoreTenantRowForOrganization: vi.fn(),
  findTenantAuthorizationByOrganizationId: vi.fn(),
  findTenantRow: vi.fn(),
  listTenantRowsByOrganizationIds: vi.fn(),
  nowUnixSeconds: vi.fn(() => 1_700_000_000),
}))

vi.mock('../tenants.repository', () => ({
  activeCurrencyExists: mocks.activeCurrencyExists,
  provisionTenantRow: mocks.provisionTenantRow,
  archiveTenantRowForOrganization: mocks.archiveTenantRowForOrganization,
  restoreTenantRowForOrganization: mocks.restoreTenantRowForOrganization,
  findTenantAuthorizationByOrganizationId:
    mocks.findTenantAuthorizationByOrganizationId,
  findTenantRow: mocks.findTenantRow,
  listTenantRowsByOrganizationIds: mocks.listTenantRowsByOrganizationIds,
}))

vi.mock('@/platform/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))

import {
  applyTenantLifecycle,
  listTenantsByOrganizationIds,
  provisionTenant,
  retrieveIntegrationOrganization,
  tenantAuthorizationByOrganizationId,
} from '../tenants.service'
import { AppHttpError } from '@/platform/errors'

describe('tenantAuthorizationByOrganizationId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when tenant not found', async () => {
    mocks.findTenantAuthorizationByOrganizationId.mockResolvedValue(null)
    await expect(
      tenantAuthorizationByOrganizationId('org_missing')
    ).resolves.toBeNull()
  })

  it('returns active true when tenant ACTIVE', async () => {
    mocks.findTenantAuthorizationByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      status: 'ACTIVE',
    })
    await expect(tenantAuthorizationByOrganizationId('org_1')).resolves.toEqual(
      { id: 'ten_1', active: true }
    )
  })

  it('returns active false when SUSPENDED', async () => {
    mocks.findTenantAuthorizationByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      status: 'SUSPENDED',
    })
    await expect(tenantAuthorizationByOrganizationId('org_1')).resolves.toEqual(
      { id: 'ten_1', active: false }
    )
  })

  it('returns active false when CLOSED', async () => {
    mocks.findTenantAuthorizationByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      status: 'CLOSED',
    })
    await expect(tenantAuthorizationByOrganizationId('org_1')).resolves.toEqual(
      { id: 'ten_1', active: false }
    )
  })

  it('passes organizationId through', async () => {
    mocks.findTenantAuthorizationByOrganizationId.mockResolvedValue(null)
    await tenantAuthorizationByOrganizationId('org_xyz')
    expect(mocks.findTenantAuthorizationByOrganizationId).toHaveBeenCalledWith(
      'org_xyz'
    )
  })
})

describe('listTenantsByOrganizationIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deduplicates organizationIds', async () => {
    mocks.listTenantRowsByOrganizationIds.mockResolvedValue([])
    await listTenantsByOrganizationIds(['org_1', 'org_1', 'org_2'])
    expect(mocks.listTenantRowsByOrganizationIds).toHaveBeenCalledWith([
      'org_1',
      'org_2',
    ])
  })

  it('preserves order of first occurrence', async () => {
    mocks.listTenantRowsByOrganizationIds.mockResolvedValue([])
    await listTenantsByOrganizationIds(['org_b', 'org_a', 'org_b'])
    expect(mocks.listTenantRowsByOrganizationIds).toHaveBeenCalledWith([
      'org_b',
      'org_a',
    ])
  })

  it('returns repository result verbatim', async () => {
    const rows = [{ id: 'ten_1' }]
    mocks.listTenantRowsByOrganizationIds.mockResolvedValue(rows)
    await expect(listTenantsByOrganizationIds(['org_1'])).resolves.toBe(rows)
  })

  it('handles empty array', async () => {
    mocks.listTenantRowsByOrganizationIds.mockResolvedValue([])
    await expect(listTenantsByOrganizationIds([])).resolves.toEqual([])
  })
})

describe('provisionTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.activeCurrencyExists.mockResolvedValue(true)
    mocks.provisionTenantRow.mockResolvedValue({
      id: 'ten_1',
      created: true,
      provisioningVersion: 3,
    })
    mocks.nowUnixSeconds.mockReturnValue(1_700_000_000)
  })

  it('throws 422 when currency unknown', async () => {
    mocks.activeCurrencyExists.mockResolvedValue(false)
    await expect(
      provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'ZZZ',
      })
    ).rejects.toMatchObject({
      code: 'billing_tenant/unknown-currency',
      httpStatus: 422,
    })
    expect(mocks.provisionTenantRow).not.toHaveBeenCalled()
  })

  it('does not call provisionTenantRow when currency invalid', async () => {
    mocks.activeCurrencyExists.mockResolvedValue(false)
    try {
      await provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'BAD',
      })
    } catch {}
    expect(mocks.provisionTenantRow).not.toHaveBeenCalled()
  })

  it('checks currency existence before provisioning', async () => {
    await provisionTenant('org_1', 'user_1', {
      name: 'Test',
      slug: 'test-org',
      defaultCurrency: 'JMD',
    })
    expect(mocks.activeCurrencyExists).toHaveBeenCalledWith('JMD')
    expect(mocks.activeCurrencyExists).toHaveBeenCalledTimes(1)
  })

  it('calls provisionTenantRow with normalized now', async () => {
    mocks.nowUnixSeconds.mockReturnValue(1_799_000_000)
    await provisionTenant('org_1', 'user_1', {
      name: 'My Org',
      slug: 'my-org',
      defaultCurrency: 'JMD',
    })
    expect(mocks.provisionTenantRow).toHaveBeenCalledWith({
      organizationId: 'org_1',
      userId: 'user_1',
      name: 'My Org',
      slug: 'my-org',
      defaultCurrency: 'JMD',
      now: 1_799_000_000,
    })
  })

  it('returns billing_tenant object on success', async () => {
    mocks.provisionTenantRow.mockResolvedValue({
      id: 'ten_123',
      created: false,
      provisioningVersion: 2,
    })
    const result = await provisionTenant('org_1', 'user_1', {
      name: 'Test',
      slug: 'test-org',
      defaultCurrency: 'JMD',
    })
    expect(result).toEqual({
      object: 'billing_tenant',
      id: 'ten_123',
      created: false,
      provisioningVersion: 2,
    })
  })

  it('maps unique constraint to 409 already-exists', async () => {
    const err = Object.assign(new Error('unique'), { code: 'P2002' })
    mocks.provisionTenantRow.mockRejectedValue(err)
    await expect(
      provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'JMD',
      })
    ).rejects.toMatchObject({
      code: 'billing_tenant/already-exists',
      httpStatus: 409,
    })
  })

  it('rethrows non-unique errors', async () => {
    const err = new Error('db down')
    mocks.provisionTenantRow.mockRejectedValue(err)
    await expect(
      provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'JMD',
      })
    ).rejects.toBe(err)
  })

  it('rethrows P2034 transaction errors', async () => {
    const err = Object.assign(new Error('retryable'), { code: 'P2034' })
    mocks.provisionTenantRow.mockRejectedValue(err)
    await expect(
      provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'JMD',
      })
    ).rejects.toBe(err)
  })

  it('propagates message for unknown currency', async () => {
    mocks.activeCurrencyExists.mockResolvedValue(false)
    try {
      await provisionTenant('org_1', 'user_1', {
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'XYZ',
      })
    } catch (e) {
      expect((e as AppHttpError).message).toBe(
        'That currency is not supported.'
      )
    }
  })

  it('uses userId verbatim', async () => {
    await provisionTenant('org_1', 'user_special_123', {
      name: 'Test',
      slug: 'test-org',
      defaultCurrency: 'JMD',
    })
    expect(mocks.provisionTenantRow).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_special_123' })
    )
  })
})

describe('applyTenantLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nowUnixSeconds.mockReturnValue(1_800_000_000)
    mocks.archiveTenantRowForOrganization.mockResolvedValue({
      id: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: 1_800_000_000,
    })
    mocks.restoreTenantRowForOrganization.mockResolvedValue({
      id: 'ten_1',
      status: 'ACTIVE',
      deletedAt: null,
    })
  })

  it('archives when action is archive', async () => {
    const result = await applyTenantLifecycle('org_1', {
      organizationId: 'org_1',
      action: 'archive',
      deletedBy: 'user_1',
      reason: 'deleted',
    })
    expect(mocks.archiveTenantRowForOrganization).toHaveBeenCalledWith({
      organizationId: 'org_1',
      deletedBy: 'user_1',
      reason: 'deleted',
      now: 1_800_000_000,
    })
    expect(mocks.restoreTenantRowForOrganization).not.toHaveBeenCalled()
    expect(result).toEqual({
      object: 'billing_tenant_lifecycle',
      organizationId: 'org_1',
      action: 'archive',
      tenantId: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: 1_800_000_000,
    })
  })

  it('restores when action is restore', async () => {
    const result = await applyTenantLifecycle('org_1', {
      organizationId: 'org_1',
      action: 'restore',
    })
    expect(mocks.restoreTenantRowForOrganization).toHaveBeenCalledWith({
      organizationId: 'org_1',
      now: 1_800_000_000,
    })
    expect(mocks.archiveTenantRowForOrganization).not.toHaveBeenCalled()
    expect(result).toEqual({
      object: 'billing_tenant_lifecycle',
      organizationId: 'org_1',
      action: 'restore',
      tenantId: 'ten_1',
      status: 'ACTIVE',
      deletedAt: null,
    })
  })

  it('coalesces undefined deletedBy/reason to null for archive', async () => {
    await applyTenantLifecycle('org_1', {
      organizationId: 'org_1',
      action: 'archive',
    })
    expect(mocks.archiveTenantRowForOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ deletedBy: null, reason: null })
    )
  })

  it('handles null tenant (org never had workspace) for archive', async () => {
    mocks.archiveTenantRowForOrganization.mockResolvedValue(null)
    const result = await applyTenantLifecycle('org_none', {
      organizationId: 'org_none',
      action: 'archive',
    })
    expect(result).toEqual({
      object: 'billing_tenant_lifecycle',
      organizationId: 'org_none',
      action: 'archive',
      tenantId: null,
      status: null,
      deletedAt: null,
    })
  })

  it('handles null tenant for restore', async () => {
    mocks.restoreTenantRowForOrganization.mockResolvedValue(null)
    const result = await applyTenantLifecycle('org_none', {
      organizationId: 'org_none',
      action: 'restore',
    })
    expect(result).toEqual({
      object: 'billing_tenant_lifecycle',
      organizationId: 'org_none',
      action: 'restore',
      tenantId: null,
      status: null,
      deletedAt: null,
    })
  })

  it('uses nowUnixSeconds for timestamp', async () => {
    mocks.nowUnixSeconds.mockReturnValue(1_234_567_890)
    await applyTenantLifecycle('org_1', {
      organizationId: 'org_1',
      action: 'archive',
    })
    expect(mocks.archiveTenantRowForOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ now: 1_234_567_890 })
    )
  })

  it('preserves organizationId in result', async () => {
    const result = await applyTenantLifecycle('org_special_123', {
      organizationId: 'org_special_123',
      action: 'restore',
    })
    expect(result.organizationId).toBe('org_special_123')
  })

  it('preserves action in result', async () => {
    const result = await applyTenantLifecycle('org_1', {
      organizationId: 'org_1',
      action: 'archive',
    })
    expect(result.action).toBe('archive')
  })
})

describe('retrieveIntegrationOrganization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when tenant not found', async () => {
    mocks.findTenantRow.mockResolvedValue(null)
    await expect(
      retrieveIntegrationOrganization('ten_missing')
    ).rejects.toMatchObject({
      code: 'billing/tenant-not-found',
      httpStatus: 404,
    })
  })

  it('returns billing_organization object when found', async () => {
    mocks.findTenantRow.mockResolvedValue({
      id: 'ten_1',
      organizationId: 'org_1',
      slug: 'test-org',
      name: 'Test Org',
      countryCode: 'JM',
      status: 'ACTIVE',
      defaultCurrency: 'JMD',
      defaultLanguage: 'en',
      provisioningVersion: 3,
      provisionedAt: 1000,
      createdAt: 1000,
      updatedAt: 1000,
    })
    const result = await retrieveIntegrationOrganization('ten_1')
    expect(result).toEqual({
      object: 'billing_organization',
      id: 'ten_1',
      organizationId: 'org_1',
      slug: 'test-org',
      name: 'Test Org',
      countryCode: 'JM',
      status: 'ACTIVE',
      defaultCurrency: 'JMD',
      defaultLanguage: 'en',
      provisioningVersion: 3,
      provisionedAt: 1000,
      createdAt: 1000,
      updatedAt: 1000,
    })
  })

  it('throws with correct message', async () => {
    mocks.findTenantRow.mockResolvedValue(null)
    try {
      await retrieveIntegrationOrganization('ten_x')
    } catch (e) {
      expect((e as AppHttpError).message).toBe(
        'The Billing workspace was not found.'
      )
    }
  })

  it('passes tenantId to repository', async () => {
    mocks.findTenantRow.mockResolvedValue({
      id: 'ten_1',
      organizationId: null,
      slug: 'x',
      name: 'x',
      countryCode: 'JM',
      status: 'ACTIVE',
      defaultCurrency: 'JMD',
      defaultLanguage: 'en',
      provisioningVersion: 3,
      provisionedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    await retrieveIntegrationOrganization('ten_abc_123')
    expect(mocks.findTenantRow).toHaveBeenCalledWith('ten_abc_123')
  })
})
