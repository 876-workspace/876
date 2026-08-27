import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    listWithMembers: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listMembers: vi.fn(),
    retrieveMember: vi.fn(),
    upsertMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../teams.repository.js', () => repository)

const { createTeamsRouter } = await import('../teams.routes.js')

const HEADERS = {
  'x-internal-key': 'crm-internal-key',
}

const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

const createdAt = new Date('2026-08-26T18:00:00.000Z')
const updatedAt = new Date('2026-08-27T09:30:00.000Z')

const teamRow = {
  id: 'crm_team_1',
  tenantId: tenant.id,
  name: 'Customer Success',
  slug: 'customer-success',
  description: 'Handles customer requests',
  color: '#3366ff',
  isDefault: false,
  autoAssign: 'NONE',
  status: 'ACTIVE',
  createdBy: 'usr_1',
  createdAt,
  updatedAt,
  deletedAt: null,
  deletedBy: null,
}

const memberRow = {
  id: 'crm_tmem_1',
  tenantId: tenant.id,
  teamId: teamRow.id,
  userId: 'usr_2',
  role: 'LEAD',
  addedBy: 'usr_1',
  createdAt,
  updatedAt,
}

const teamWithMembersRow = {
  ...teamRow,
  members: [memberRow],
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/teams', createTeamsRouter())
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...HEADERS,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRM_INTERNAL_KEY = 'crm-internal-key'
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  repository.list.mockResolvedValue([teamRow])
  repository.listWithMembers.mockResolvedValue([teamWithMembersRow])
  repository.retrieve.mockResolvedValue(teamWithMembersRow)
  repository.create.mockResolvedValue(teamWithMembersRow)
  repository.update.mockResolvedValue(teamWithMembersRow)
  repository.remove.mockResolvedValue({
    object: 'team',
    id: teamRow.id,
    deleted: true,
  })
  repository.listMembers.mockResolvedValue([memberRow])
  repository.retrieveMember.mockResolvedValue(memberRow)
  repository.upsertMember.mockResolvedValue(memberRow)
  repository.updateMember.mockResolvedValue(memberRow)
  repository.removeMember.mockResolvedValue(memberRow)
})

describe('CRM team routes', () => {
  it('updates the role when adding a member who is already on the team', async () => {
    const response = await requestJson(
      'POST',
      `/v1/organizations/org_1/teams/${teamRow.id}/members`,
      {
        userId: memberRow.userId,
        role: 'LEAD',
        addedBy: 'usr_1',
      }
    )

    expect(response).toEqual({
      status: 201,
      body: {
        data: {
          object: 'team_member',
          id: memberRow.id,
          tenantId: tenant.id,
          teamId: teamRow.id,
          userId: memberRow.userId,
          role: 'LEAD',
          addedBy: 'usr_1',
          createdAt: 1787767200,
          updatedAt: 1787823000,
        },
        error: null,
      },
    })
    expect(repository.upsertMember).toHaveBeenCalledOnce()
    expect(repository.upsertMember).toHaveBeenCalledWith({
      tenantId: tenant.id,
      teamId: teamRow.id,
      userId: memberRow.userId,
      role: 'LEAD',
      addedBy: 'usr_1',
    })
    expect(repository.retrieveMember).not.toHaveBeenCalled()
  })

  it('passes isDefault through when creating a team', async () => {
    const createdTeam = {
      ...teamWithMembersRow,
      name: 'Escalations & Appeals',
      slug: 'escalations-appeals',
      isDefault: true,
      createdBy: 'usr_3',
      members: [],
    }
    repository.create.mockResolvedValue(createdTeam)

    const response = await requestJson(
      'POST',
      '/v1/organizations/org_1/teams',
      {
        name: 'Escalations & Appeals',
        isDefault: true,
        createdBy: 'usr_3',
      }
    )

    expect(response).toEqual({
      status: 201,
      body: {
        data: {
          object: 'team',
          id: teamRow.id,
          tenantId: tenant.id,
          name: 'Escalations & Appeals',
          slug: 'escalations-appeals',
          description: teamRow.description,
          color: teamRow.color,
          isDefault: true,
          autoAssign: 'NONE',
          status: 'ACTIVE',
          createdBy: 'usr_3',
          createdAt: 1787767200,
          updatedAt: 1787823000,
          members: [],
        },
        error: null,
      },
    })
    expect(repository.create).toHaveBeenCalledOnce()
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      name: 'Escalations & Appeals',
      isDefault: true,
      createdBy: 'usr_3',
      slug: 'escalations-appeals',
    })
  })

  it('passes the tenant id when deleting a team', async () => {
    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_1/teams/${teamRow.id}`,
      { deletedBy: 'usr_4', reason: 'Consolidated teams' }
    )

    expect(response).toEqual({
      status: 200,
      body: {
        data: {
          object: 'team',
          id: teamRow.id,
          deleted: true,
        },
        error: null,
      },
    })
    expect(repository.remove).toHaveBeenCalledOnce()
    expect(repository.remove).toHaveBeenCalledWith({
      tenantId: tenant.id,
      id: teamRow.id,
      deletedBy: 'usr_4',
      reason: 'Consolidated teams',
    })
  })

  it('returns the team not found contract for a missing team', async () => {
    repository.retrieve.mockResolvedValue(null)

    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/teams/crm_team_missing'
    )

    expect(response).toEqual({
      status: 404,
      body: {
        data: null,
        error: {
          code: 'crm/team-not-found',
          message: 'Team not found.',
        },
      },
    })
    expect(repository.retrieve).toHaveBeenCalledOnce()
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      'crm_team_missing'
    )
  })

  it('returns the full team list envelope', async () => {
    const response = await requestJson('GET', '/v1/organizations/org_1/teams')

    expect(response).toEqual({
      status: 200,
      body: {
        data: {
          object: 'list',
          data: [
            {
              object: 'team',
              id: teamRow.id,
              tenantId: tenant.id,
              name: 'Customer Success',
              slug: 'customer-success',
              description: 'Handles customer requests',
              color: '#3366ff',
              isDefault: false,
              autoAssign: 'NONE',
              status: 'ACTIVE',
              createdBy: 'usr_1',
              createdAt: 1787767200,
              updatedAt: 1787823000,
            },
          ],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/teams',
        },
        error: null,
      },
    })
    expect(repository.list).toHaveBeenCalledOnce()
    expect(repository.list).toHaveBeenCalledWith(tenant.id, undefined)
    expect(repository.listWithMembers).not.toHaveBeenCalled()
  })
})
