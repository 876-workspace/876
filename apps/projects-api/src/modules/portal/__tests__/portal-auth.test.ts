import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsMod, projectsMod, grantsRepo } = vi.hoisted(() => ({
  tenantsMod: { resolveTenant: vi.fn() },
  projectsMod: { resolveProject: vi.fn() },
  grantsRepo: { resolveActiveGrant: vi.fn() },
}))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../client-grants.repository.js', () => grantsRepo)

const { requirePortalGrant } = await import('../portal-auth.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const grant = {
  id: 'cgt_1',
  tenantId: tenant.id,
  projectId: project.id,
  userId: 'usr_client',
  allowComments: true,
  allowDiscussions: true,
  allowFiles: true,
  allowTime: true,
  allowInvoices: true,
  allowWiki: true,
  invitedBy: 'usr_owner',
  revokedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

function mockReq(headers: Record<string, string>) {
  return {
    header: (name: string) => headers[name.toLowerCase()] ?? undefined,
    params: { organizationId: 'org_alpha', projectId: project.id },
  }
}

function mockRes() {
  const json = vi.fn()
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn(() => ({ json })),
    json,
  }
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  grantsRepo.resolveActiveGrant.mockResolvedValue(grant)
})

describe('requirePortalGrant', () => {
  it('authorizes a live grant and exposes the portal context', async () => {
    const req = mockReq({
      'x-internal-key': 'test-internal-key',
      'x-user-id': 'usr_client',
    })
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.locals.portal).toMatchObject({
      tenantId: tenant.id,
      portalUserId: 'usr_client',
    })
    expect(grantsRepo.resolveActiveGrant).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      'usr_client'
    )
  })

  it('rejects callers without the internal key', async () => {
    const req = mockReq({ 'x-user-id': 'usr_client' })
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: null })
    )
  })

  it('rejects callers without an acting user', async () => {
    const req = mockReq({ 'x-internal-key': 'test-internal-key' })
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('reads a revoked grant as 404 so grant existence never leaks', async () => {
    grantsRepo.resolveActiveGrant.mockResolvedValue(null)
    const req = mockReq({
      'x-internal-key': 'test-internal-key',
      'x-user-id': 'usr_client',
    })
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: null })
    )
  })

  it('reads grants for other projects as 404', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)
    const req = mockReq({
      'x-internal-key': 'test-internal-key',
      'x-user-id': 'usr_client',
    })
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(grantsRepo.resolveActiveGrant).not.toHaveBeenCalled()
  })

  it('isolates tenants: a grant from another tenant never authorizes', async () => {
    tenantsMod.resolveTenant.mockImplementation(async (orgId: string) =>
      orgId === 'org_beta' ? { id: 'ten_beta' } : tenant
    )
    grantsRepo.resolveActiveGrant.mockImplementation(
      async (tenantId: string) => (tenantId === tenant.id ? grant : null)
    )
    const req = {
      header: (name: string) =>
        ({ 'x-internal-key': 'test-internal-key', 'x-user-id': 'usr_client' })[
          name.toLowerCase()
        ],
      params: { organizationId: 'org_beta', projectId: project.id },
    }
    const res = mockRes()
    const next = vi.fn()

    await requirePortalGrant(req as never, res as never, next)

    expect(grantsRepo.resolveActiveGrant).toHaveBeenCalledWith(
      'ten_beta',
      project.id,
      'usr_client'
    )
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
