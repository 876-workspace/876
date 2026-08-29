import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenantsRepo, reconcile, fixtures } = vi.hoisted(() => ({
  tenantsRepo: {
    ensure: vi.fn(),
    markProvisioned: vi.fn(),
    retrieveByOrganization: vi.fn(),
  },
  reconcile: { reconcileCrmProvisioning: vi.fn() },
  fixtures: { ensureCrmWorkspaceFixtures: vi.fn() },
}))
vi.mock('./tenants.repository.js', () => tenantsRepo)
vi.mock('../../provisioning/reconcile.js', () => reconcile)
vi.mock('../../provisioning/fixtures.js', () => fixtures)

const { ensure } = await import('./tenants.service.js')

describe('tenants.service - ensure returns values not throws', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tenantsRepo.ensure.mockResolvedValue({
      id: 't1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      revision: 1,
    })
    tenantsRepo.markProvisioned.mockResolvedValue({
      id: 't1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      revision: 2,
    })
    reconcile.reconcileCrmProvisioning.mockResolvedValue(null)
    fixtures.ensureCrmWorkspaceFixtures.mockResolvedValue(undefined)
  })

  it('returns tenant when no provisioning', async () => {
    const res = await ensure('org_1')
    expect(res).toEqual(expect.objectContaining({ id: 't1' }))
    expect(reconcile.reconcileCrmProvisioning).not.toHaveBeenCalled()
  })

  it('propagates provisioning error as value', async () => {
    const provisioningError = {
      code: 'crm/provisioning-invalid',
      message: 'bad',
      httpStatus: 500,
    } as const
    reconcile.reconcileCrmProvisioning.mockResolvedValue(
      provisioningError as unknown as null
    )
    const manifest = {
      revision: 2,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/provisioning-invalid' })
    expect(tenantsRepo.markProvisioned).not.toHaveBeenCalled()
  })

  it('marks provisioned after successful reconcile', async () => {
    const manifest = {
      revision: 5,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(reconcile.reconcileCrmProvisioning).toHaveBeenCalledWith(
      't1',
      manifest
    )
    expect(tenantsRepo.markProvisioned).toHaveBeenCalledWith('t1', 5)
    expect(res).toEqual(expect.objectContaining({ revision: 2 }))
  })

  it('returns tenant even when reconcile returns null', async () => {
    reconcile.reconcileCrmProvisioning.mockResolvedValue(null)
    const manifest = {
      revision: 1,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    const res = await ensure('org_1', manifest)
    expect(isError(res)).toBe(false)
  })

  it('does not swallow unexpected exception from reconcile', async () => {
    reconcile.reconcileCrmProvisioning.mockRejectedValue(new Error('db down'))
    const manifest = {
      revision: 1,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    await expect(ensure('org_1', manifest)).rejects.toThrow('db down')
  })

  it('does not ensure workspace fixtures when none are requested', async () => {
    await ensure('org_1')

    expect(fixtures.ensureCrmWorkspaceFixtures).not.toHaveBeenCalled()
  })

  it('ensures requested workspace fixtures against the resolved tenant', async () => {
    await ensure('org_1', undefined, ['876_SUPPORT'])

    expect(fixtures.ensureCrmWorkspaceFixtures).toHaveBeenCalledTimes(1)
    expect(fixtures.ensureCrmWorkspaceFixtures).toHaveBeenCalledWith('t1', [
      '876_SUPPORT',
    ])
  })

  it('ensures fixtures without requiring a provisioning manifest', async () => {
    const res = await ensure('org_1', undefined, ['876_SUPPORT'])

    expect(reconcile.reconcileCrmProvisioning).not.toHaveBeenCalled()
    expect(tenantsRepo.markProvisioned).not.toHaveBeenCalled()
    expect(res).toEqual(expect.objectContaining({ id: 't1', revision: 1 }))
  })

  it('does not ensure fixtures when provisioning fails', async () => {
    reconcile.reconcileCrmProvisioning.mockResolvedValue({
      code: 'crm/provisioning-invalid',
      message: 'bad',
      httpStatus: 500,
    } as unknown as null)
    const manifest = {
      revision: 2,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]

    const res = await ensure('org_1', manifest, ['876_SUPPORT'])

    expect(isError(res)).toBe(true)
    expect(fixtures.ensureCrmWorkspaceFixtures).not.toHaveBeenCalled()
  })
})
