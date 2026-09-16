import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsMod, projectsMod, automationMod, repository } = vi.hoisted(
  () => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    automationMod: { createNotificationRecord: vi.fn() },
    repository: {
      listGrants: vi.fn(),
      findGrantForUser: vi.fn(),
      retrieveGrant: vi.fn(),
      createGrant: vi.fn(),
      updateGrant: vi.fn(),
    },
  })
)

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../automation/index.js', () => automationMod)
vi.mock('../client-grants.repository.js', () => repository)

const service = await import('../client-grants.service.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha', name: 'Alpha' }

function grantRow(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
})

describe('client grants service', () => {
  it('invites a client and notifies them', async () => {
    repository.findGrantForUser.mockResolvedValue(null)
    repository.createGrant.mockResolvedValue(grantRow())

    const result = await service.inviteGrant('org_1', project.id, {
      userId: 'usr_client',
      invitedBy: 'usr_owner',
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.client-grant',
      userId: 'usr_client',
      revokedAt: null,
    })
    expect(automationMod.createNotificationRecord).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        userId: 'usr_client',
        kind: 'client-grant-invite',
      })
    )
  })

  it('rejects duplicate active grants for the same user', async () => {
    repository.findGrantForUser.mockResolvedValue(grantRow())

    const result = await service.inviteGrant('org_1', project.id, {
      userId: 'usr_client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/client-grant-exists')
    expect(repository.createGrant).not.toHaveBeenCalled()
  })

  it('revokes a grant by stamping revokedAt', async () => {
    repository.retrieveGrant.mockResolvedValue(grantRow())
    repository.updateGrant.mockImplementation(
      async (id: string, patch: Record<string, unknown>) => ({
        ...grantRow(),
        ...patch,
      })
    )

    const result = await service.revokeGrant('org_1', project.id, 'cgt_1')

    expect(result.error).toBeNull()
    expect(result.data?.revokedAt).not.toBeNull()
    expect(repository.updateGrant).toHaveBeenCalledWith(
      'cgt_1',
      expect.objectContaining({ revokedAt: expect.anything() })
    )
  })

  it('returns 404 when revoking an unknown grant', async () => {
    repository.retrieveGrant.mockResolvedValue(null)

    const result = await service.revokeGrant('org_1', project.id, 'cgt_missing')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/client-grant-not-found')
  })
})
