import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantsRepo: {
    ensure: vi.fn(),
    markProvisioned: vi.fn(),
    retrieveByOrganization: vi.fn(),
  },
  reconcile: { reconcileCrmProvisioning: vi.fn() },
  fixtures: { ensureCrmWorkspaceFixtures: vi.fn() },
}))

vi.mock('./tenants.repository.js', () => mocks.tenantsRepo)
vi.mock('../../provisioning/reconcile.js', () => mocks.reconcile)
vi.mock('../../provisioning/fixtures.js', () => mocks.fixtures)

const { ensure } = await import('./tenants.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.tenantsRepo.ensure.mockResolvedValue({
    id: 't1',
    organizationId: 'org_1',
    status: 'ACTIVE',
    revision: 1,
  })
  mocks.tenantsRepo.markProvisioned.mockResolvedValue({
    id: 't1',
    organizationId: 'org_1',
    status: 'ACTIVE',
    revision: 2,
  })
  mocks.reconcile.reconcileCrmProvisioning.mockResolvedValue(null)
  mocks.fixtures.ensureCrmWorkspaceFixtures.mockResolvedValue(undefined)
})

describe('CRM tenant ensure', () => {
  it('keeps CRM tenant provisioning independent of Work operator access', async () => {
    const result = await ensure('org_1')
    expect(result).toEqual(expect.objectContaining({ id: 't1' }))
    expect(mocks.reconcile.reconcileCrmProvisioning).not.toHaveBeenCalled()
  })

  it('propagates provisioning errors after Work is available', async () => {
    mocks.reconcile.reconcileCrmProvisioning.mockResolvedValue({
      code: 'crm/provisioning-invalid',
      message: 'bad',
      httpStatus: 500,
    })
    const manifest = {
      revision: 2,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    const result = await ensure('org_1', manifest)
    expect(result).toMatchObject({ code: 'crm/provisioning-invalid' })
    expect(mocks.tenantsRepo.markProvisioned).not.toHaveBeenCalled()
  })

  it('marks successful CRM provisioning after Work is prepared', async () => {
    const manifest = {
      revision: 5,
      priorities: [],
      categories: [],
      subcategories: [],
    } as unknown as Parameters<typeof ensure>[1]
    await ensure('org_1', manifest)
    expect(mocks.reconcile.reconcileCrmProvisioning).toHaveBeenCalledWith(
      't1',
      manifest
    )
    expect(mocks.tenantsRepo.markProvisioned).toHaveBeenCalledWith('t1', 5)
  })

  it('still ensures requested CRM fixtures in the CRM tenant', async () => {
    await ensure('org_1', undefined, ['876_SUPPORT'])
    expect(mocks.fixtures.ensureCrmWorkspaceFixtures).toHaveBeenCalledWith(
      't1',
      ['876_SUPPORT']
    )
  })
})
