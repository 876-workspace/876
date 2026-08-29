import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenantsRepo, reconcile } = vi.hoisted(() => ({
  tenantsRepo: { ensure: vi.fn(), markProvisioned: vi.fn(), retrieveByOrganization: vi.fn() },
  reconcile: { reconcileCrmProvisioning: vi.fn() },
}))
vi.mock('./tenants.repository.js', () => tenantsRepo)
vi.mock('../../provisioning/reconcile.js', () => reconcile)

const { ensure } = await import('./tenants.service.js')

describe('tenants.service - ensure returns values not throws', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tenantsRepo.ensure.mockResolvedValue({ id: 't1', organizationId: 'org_1', status: 'ACTIVE', revision: 1 })
    tenantsRepo.markProvisioned.mockResolvedValue({ id: 't1', organizationId: 'org_1', status: 'ACTIVE', revision: 2 })
    reconcile.reconcileCrmProvisioning.mockResolvedValue(null)
  })

  it('returns tenant when no provisioning', async () => {
    const res = await ensure('org_1')
    expect(res).toEqual(expect.objectContaining({ id: 't1' }))
    expect(reconcile.reconcileCrmProvisioning).not.toHaveBeenCalled()
  })

  it('propagates provisioning error as value', async () => {
    const provisioningError = { code: 'crm/provisioning-invalid', message: 'bad', httpStatus: 500 } as const
    reconcile.reconcileCrmProvisioning.mockResolvedValue(provisioningError as unknown as null)
    const manifest = { revision: 2, priorities: [], categories: [], subcategories: [] } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/provisioning-invalid' })
    expect(tenantsRepo.markProvisioned).not.toHaveBeenCalled()
  })

  it('marks provisioned after successful reconcile', async () => {
    const manifest = { revision: 5, priorities: [], categories: [], subcategories: [] } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(reconcile.reconcileCrmProvisioning).toHaveBeenCalledWith('t1', manifest)
    expect(tenantsRepo.markProvisioned).toHaveBeenCalledWith('t1', 5)
    expect(res).toEqual(expect.objectContaining({ revision: 2 }))
  })

  it('returns tenant even when reconcile returns null', async () => {
    reconcile.reconcileCrmProvisioning.mockResolvedValue(null)
    const manifest = { revision: 1, priorities: [], categories: [], subcategories: [] } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(isError(res)).toBe(false)
  })

  it('does not swallow unexpected exception from reconcile', async () => {
    reconcile.reconcileCrmProvisioning.mockRejectedValue(new Error('db down'))
    const manifest = { revision: 1, priorities: [], categories: [], subcategories: [] } as unknown as Parameters<typeof ensure>[1]
    await expect(ensure('org_1', manifest)).rejects.toThrow('db down')
  })
})
