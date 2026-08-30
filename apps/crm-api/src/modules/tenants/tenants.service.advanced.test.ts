import { isError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantsRepo: {
    ensure: vi.fn(),
    markProvisioned: vi.fn(),
    retrieveByOrganization: vi.fn(),
  },
  reconcile: { reconcileCrmProvisioning: vi.fn() },
  fixtures: { ensureCrmWorkspaceFixtures: vi.fn() },
  workEnsure: vi.fn(),
}))

vi.mock('./tenants.repository.js', () => mocks.tenantsRepo)
vi.mock('../../provisioning/reconcile.js', () => mocks.reconcile)
vi.mock('../../provisioning/fixtures.js', () => mocks.fixtures)
vi.mock('../../providers/work.js', () => ({
  workClient: () => ({ workspace: { ensure: mocks.workEnsure } }),
}))

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
  mocks.workEnsure.mockResolvedValue({
    data: {
      object: 'work_tenant',
      id: 'work_tnt_1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      createdAt: 1,
      updatedAt: 1,
    },
    error: null,
  })
})

describe('CRM tenant ensure coordinates Work infrastructure', () => {
  it('ensures Work even without a standalone Work product entitlement', async () => {
    const result = await ensure('org_1')
    expect(mocks.workEnsure).toHaveBeenCalledWith('org_1')
    expect(result).toEqual(expect.objectContaining({ id: 't1' }))
  })

  it('fails as a registered CRM value when Work cannot be prepared', async () => {
    mocks.workEnsure.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })
    const result = await ensure('org_1')
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'crm/work-unavailable' })
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
    expect(mocks.fixtures.ensureCrmWorkspaceFixtures).toHaveBeenCalledWith('t1', [
      '876_SUPPORT',
    ])
  })
})
