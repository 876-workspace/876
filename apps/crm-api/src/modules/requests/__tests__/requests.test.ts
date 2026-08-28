import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    customerExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    removeNote: vi.fn(),
    updateNote: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    isTeamMember: vi.fn(),
  },
}))

vi.mock('../requests.tasks.service.js', () => ({
  tasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  reminders: vi.fn(),
  createReminder: vi.fn(),
  updateReminder: vi.fn(),
  removeReminder: vi.fn(),
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => repository)

const { createRequestsRouter } = await import('../requests.routes.js')
const requestsService = await import('../requests.service.js')

const HEADERS = {
  'x-internal-key': 'crm-internal-key',
}

const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

const requestRow = {
  id: 'crm_req_1',
  tenantId: tenant.id,
  customerId: 'crm_cus_1',
  number: 42,
  subject: 'Need help',
  category: 'SUPPORT',
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: 'usr_requester_1',
  requesterContactId: 'con_1',
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-08-26T18:00:00.000Z'),
  updatedAt: new Date('2026-08-26T18:00:00.000Z'),
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/requests', createRequestsRouter())
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
  repository.list.mockResolvedValue([requestRow])
  repository.retrieve.mockResolvedValue(requestRow)
  repository.customerExists.mockResolvedValue({ id: 'crm_cus_1' })
  repository.create.mockResolvedValue(requestRow)
  repository.update.mockResolvedValue(requestRow)
  repository.remove.mockResolvedValue({
    object: 'request',
    id: 'crm_req_1',
    deleted: true,
  })
  repository.listNotes.mockResolvedValue([])
  repository.createNote.mockResolvedValue({})
  repository.removeNote.mockResolvedValue({})
  repository.updateNote.mockResolvedValue({})
  repository.categoryExists.mockResolvedValue(null)
  repository.subcategoryExists.mockResolvedValue(null)
  repository.teamExists.mockResolvedValue({ id: 'crm_team_1' })
  repository.isTeamMember.mockResolvedValue(null)
})

describe('CRM request routes', () => {
  it('forwards request list filters from the query string', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests?status=OPEN&teamId=crm_team_1&assigneeId=usr_2&customerId=crm_cus_1&categoryId=crm_cat_1&priority=HIGH'
    )

    expect(response.status).toBe(200)
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      status: 'OPEN',
      teamId: 'crm_team_1',
      assigneeId: 'usr_2',
      customerId: 'crm_cus_1',
      categoryId: 'crm_cat_1',
      priority: 'HIGH',
    })
    expect(response.body.data.data[0]).toMatchObject({
      teamId: null,
      assigneeId: null,
    })
  })

  it('accepts a teamId when creating a request', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_1/requests',
      {
        customerId: 'crm_cus_1',
        subject: 'Need help',
        createdBy: 'usr_1',
        teamId: 'crm_team_1',
        assigneeId: 'usr_2',
      }
    )

    expect(response.status).toBe(201)
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      teamId: 'crm_team_1',
      assigneeId: 'usr_2',
    })
  })

  it('accepts a teamId when updating a request', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_1/requests/crm_req_1',
      {
        teamId: null,
        assigneeId: 'usr_2',
      }
    )

    expect(response.status).toBe(200)
    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      teamId: null,
      assigneeId: 'usr_2',
    })
  })

  it('clears an assignee who is not a member of a newly selected team', async () => {
    repository.retrieve.mockResolvedValue({
      ...requestRow,
      assigneeId: 'usr_2',
    })

    await requestsService.update('org_1', 'crm_req_1', {
      teamId: 'crm_team_2',
    })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      teamId: 'crm_team_2',
      assigneeId: null,
    })
  })

  it('keeps an assignee who is a member of a newly selected team', async () => {
    repository.isTeamMember.mockResolvedValue({ id: 'crm_tmem_1' })
    repository.retrieve.mockResolvedValue({
      ...requestRow,
      assigneeId: 'usr_2',
    })

    await requestsService.update('org_1', 'crm_req_1', {
      teamId: 'crm_team_2',
    })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      teamId: 'crm_team_2',
    })
  })

  it('leaves an assignee untouched when clearing the team', async () => {
    repository.retrieve.mockResolvedValue({
      ...requestRow,
      teamId: 'crm_team_1',
      assigneeId: 'usr_2',
    })

    await requestsService.update('org_1', 'crm_req_1', { teamId: null })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      teamId: null,
    })
    expect(repository.isTeamMember).not.toHaveBeenCalled()
  })

  it('applies a category default team only when the caller did not select one', async () => {
    repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: 'crm_team_1',
      defaultPriority: null,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
    })

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      teamId: 'crm_team_1',
    })
  })

  it('keeps an explicitly selected team over a category default', async () => {
    repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: 'crm_team_1',
      defaultPriority: null,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      teamId: 'crm_team_2',
    })

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      teamId: 'crm_team_2',
    })
  })

  it('rejects a subcategory belonging to a different category', async () => {
    repository.categoryExists.mockResolvedValue({ id: 'crm_cat_1' })
    repository.subcategoryExists.mockResolvedValue({
      id: 'crm_subcat_1',
      categoryId: 'crm_cat_2',
    })

    await expect(
      requestsService.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'Need help',
        createdBy: 'usr_1',
        categoryId: 'crm_cat_1',
        subcategoryId: 'crm_subcat_1',
      })
    ).rejects.toMatchObject({
      code: 'crm/subcategory-category-mismatch',
      httpStatus: 422,
    })
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('returns the full list envelope', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ object: 'request', id: 'crm_req_1' })],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/requests',
      },
      error: null,
    })
  })

  it('stamps resolution when a request moves to RESOLVED', async () => {
    await requestsService.update('org_1', 'crm_req_1', { status: 'RESOLVED' })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      status: 'RESOLVED',
      resolvedAt: expect.any(Date),
    })
  })
})

describe('requests - the person who raised it', () => {
  it('serializes the requester onto the resource', async () => {
    const { body } = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1'
    )

    expect(body.data.requesterUserId).toBe('usr_requester_1')
    expect(body.data.requesterContactId).toBe('con_1')
    expect(body.error).toBeNull()
  })

  it('serializes a null requester for a request raised for the organization', async () => {
    repository.retrieve.mockResolvedValue({
      ...requestRow,
      requesterUserId: null,
      requesterContactId: null,
    })

    const { body } = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1'
    )

    expect(body.data.requesterUserId).toBeNull()
    expect(body.data.requesterContactId).toBeNull()
  })

  it('persists the requester given on create', async () => {
    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Cannot sign in',
      requesterUserId: 'usr_requester_1',
      requesterContactId: 'con_1',
      createdBy: 'usr_1',
    })

    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'crm_tenant_1',
        customerId: 'crm_cus_1',
        requesterUserId: 'usr_requester_1',
        requesterContactId: 'con_1',
      })
    )
  })

  it('creates a request with no requester when none is given', async () => {
    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Quarterly invoice query',
      createdBy: 'usr_1',
    })

    const [params] = repository.create.mock.calls[0]
    expect(params.requesterUserId).toBeUndefined()
    expect(params.requesterContactId).toBeUndefined()
  })

  it('reassigns the requester on update', async () => {
    await requestsService.update('org_1', 'crm_req_1', {
      requesterUserId: 'usr_requester_2',
      requesterContactId: 'con_2',
    })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      requesterUserId: 'usr_requester_2',
      requesterContactId: 'con_2',
    })
  })

  it('clears the requester when update passes null', async () => {
    await requestsService.update('org_1', 'crm_req_1', {
      requesterUserId: null,
      requesterContactId: null,
    })

    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      requesterUserId: null,
      requesterContactId: null,
    })
  })

  it('forwards a requesterUserId filter to the repository', async () => {
    await requestsService.list('org_1', { requesterUserId: 'usr_requester_1' })

    expect(repository.list).toHaveBeenCalledWith('crm_tenant_1', {
      requesterUserId: 'usr_requester_1',
    })
  })
})
