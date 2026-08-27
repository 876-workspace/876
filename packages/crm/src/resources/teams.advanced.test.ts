import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@876/core/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@876/core/client')>()),
  sendClientRequest: vi.fn(),
}))
import { sendClientRequest } from '@876/core/client'
import { create876CrmClient } from '../client.js'

/** The transport's real result shape, so a stub cannot drift from it. */
type ClientResponse = Awaited<ReturnType<typeof sendClientRequest>>

const mockSend = vi.mocked(sendClientRequest)
function json(data: unknown, ok = true) {
  return { ok, payload: { data, error: null } } as unknown as ClientResponse
}
function err(code: string, message: string) {
  return {
    ok: true,
    payload: { data: null, error: { code, message } },
  } as unknown as ClientResponse
}

const client = create876CrmClient({
  baseUrl: 'http://crm.test',
  internalKey: 'k',
  fetch: vi.fn() as unknown as typeof fetch,
})
const team = {
  object: 'team',
  id: 'crm_team_1',
  tenantId: 'crm_tenant_1',
  name: 'Support',
  slug: 'support',
  description: null,
  color: null,
  isDefault: false,
  autoAssign: 'NONE',
  status: 'ACTIVE',
  createdBy: 'usr_1',
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => vi.clearAllMocks())

describe('teams resource - URL encoding and contracts', () => {
  it('encodes organizationId with spaces and slashes', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [team],
        has_more: false,
        total_count: 1,
        url: '/x',
      })
    )
    await client.teams.list('org /north')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: expect.stringContaining('org%20%2Fnorth'),
      })
    )
  })
  it('encodes team id on retrieve', async () => {
    mockSend.mockResolvedValue(json(team))
    await client.teams.retrieve('org_1', 'team /1')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: expect.stringContaining('team%20%2F1') })
    )
  })
  it('builds query string for status and includeMembers', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.teams.list('org_1', {
      status: 'ARCHIVED',
      includeMembers: true,
    })
    const path = mockSend.mock.calls[0][1].path
    expect(path).toContain('status=ARCHIVED')
    expect(path).toContain('includeMembers=true')
  })
  it('creates team with POST', async () => {
    mockSend.mockResolvedValue(json(team))
    const res = await client.teams.create('org_1', {
      name: 'Support',
      createdBy: 'usr_1',
    })
    expect(res.data?.name).toBe('Support')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'POST' })
    )
  })
  it('updates team with PATCH', async () => {
    mockSend.mockResolvedValue(json({ ...team, name: 'New' }))
    const res = await client.teams.update('org_1', 'crm_team_1', {
      name: 'New',
    })
    expect(res.data?.name).toBe('New')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' })
    )
  })
  it('deletes team with DELETE and body', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'team', id: 'crm_team_1', deleted: true })
    )
    const res = await client.teams.delete('org_1', 'crm_team_1', {
      deletedBy: 'usr_1',
    })
    expect(res.data?.deleted).toBe(true)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
  it('returns invalid-response on malformed team', async () => {
    mockSend.mockResolvedValue(json({ object: 'team', id: 'x' }))
    const res = await client.teams.retrieve('org_1', 'x')
    expect(res.error?.code).toBe('crm/invalid-response')
  })
  it('propagates envelope error', async () => {
    mockSend.mockResolvedValue(err('crm/team-not-found', 'Team not found.'))
    const res = await client.teams.retrieve('org_1', 'missing')
    expect(res).toEqual({
      data: null,
      error: { code: 'crm/team-not-found', message: 'Team not found.' },
    })
  })
  it('handles network error', async () => {
    mockSend.mockResolvedValue({
      networkError: true,
    } as unknown as ClientResponse)
    const res = await client.teams.list('org_1')
    expect(res.error?.code).toBe('network/offline')
  })
})

describe('teams members nested resource', () => {
  const member = {
    object: 'team_member',
    id: 'crm_tmem_1',
    tenantId: 'crm_tenant_1',
    teamId: 'crm_team_1',
    userId: 'usr_2',
    role: 'MEMBER',
    addedBy: 'usr_1',
    createdAt: 1,
    updatedAt: 1,
  }
  it('lists members', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [member],
        has_more: false,
        total_count: 1,
        url: '/x',
      })
    )
    const res = await client.teams.members.list('org_1', 'crm_team_1')
    expect(res.data?.data[0].userId).toBe('usr_2')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: expect.stringContaining('/members'),
      })
    )
  })
  it('adds member with POST', async () => {
    mockSend.mockResolvedValue(json(member))
    const res = await client.teams.members.add('org_1', 'crm_team_1', {
      userId: 'usr_2',
      addedBy: 'usr_1',
    })
    expect(res.data?.role).toBe('MEMBER')
  })
  it('updates member role with PATCH and encoded userId', async () => {
    mockSend.mockResolvedValue(json({ ...member, role: 'LEAD' }))
    const res = await client.teams.members.update(
      'org_1',
      'crm_team_1',
      'user /2',
      { role: 'LEAD' }
    )
    expect(res.data?.role).toBe('LEAD')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: expect.stringContaining('user%20%2F2') })
    )
  })
  it('removes member with DELETE', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'team_member', id: 'crm_tmem_1', deleted: true })
    )
    const res = await client.teams.members.remove(
      'org_1',
      'crm_team_1',
      'usr_2'
    )
    expect(res.data?.deleted).toBe(true)
  })
  it('returns invalid-response for malformed member', async () => {
    mockSend.mockResolvedValue(json({ object: 'team_member', id: 'x' }))
    const res = await client.teams.members.add('org_1', 'crm_team_1', {
      userId: 'usr_2',
      addedBy: 'usr_1',
    })
    expect(res.error?.code).toBe('crm/invalid-response')
  })
})
