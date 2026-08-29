import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenants: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    customerExists: vi.fn(),
    create: vi.fn(),
    createFromIntake: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    isTeamMember: vi.fn(),
  },
  priorities: {
    serialize: vi.fn(),
    requireActiveForTenant: vi.fn(),
    retrieveDefaultForTenant: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => mocks.tenants)
vi.mock('../../priorities/index.js', () => mocks.priorities)
vi.mock('../requests.repository.js', () => mocks.repository)
// The requests router mounts the note/task/reminder child routers, whose
// repositories open the database at import time. This suite covers only the
// request routes, so the child repositories are stubbed out entirely.
vi.mock('../../notes/notes.repository.js', () => ({}))
vi.mock('../../tasks/tasks.repository.js', () => ({}))
vi.mock('../../reminders/reminders.repository.js', () => ({}))

const { errorHandler } = await import('../../../http/error-handler.js')
const { createRequestsRouter } = await import('../requests.routes.js')
const requestsService = await import('../requests.service.js')

const HEADERS = { 'x-internal-key': 'crm-internal-key' }

const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

const normalPriorityRow = {
  id: 'crm_pri_normal',
  tenantId: tenant.id,
  provisioningKey: 'normal',
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: null,
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: null,
  createdAt: new Date('2026-08-26T18:00:00.000Z'),
  updatedAt: new Date('2026-08-26T18:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
}

const highPriorityRow = {
  ...normalPriorityRow,
  id: 'crm_pri_high',
  provisioningKey: 'high',
  name: 'High',
  slug: 'high',
  weight: 30,
  sortOrder: 30,
  isDefault: false,
}

function priorityWire(row = normalPriorityRow) {
  return {
    object: 'request_priority' as const,
    id: row.id,
    tenantId: row.tenantId,
    provisioningKey: row.provisioningKey,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    icon: row.icon,
    weight: row.weight,
    sortOrder: row.sortOrder,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: Math.floor(row.createdAt.getTime() / 1000),
    updatedAt: Math.floor(row.updatedAt.getTime() / 1000),
  }
}

const requestRow = {
  id: 'crm_req_1',
  tenantId: tenant.id,
  customerId: 'crm_cus_1',
  number: 42,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN',
  priorityId: normalPriorityRow.id,
  priority: normalPriorityRow,
  channel: 'AGENT',
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
  deletedAt: null,
  deletedBy: null,
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/requests', createRequestsRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...HEADERS },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRM_INTERNAL_KEY = 'crm-internal-key'
  mocks.tenants.retrieveByOrganization.mockResolvedValue(tenant)
  mocks.repository.list.mockResolvedValue([requestRow])
  mocks.repository.retrieve.mockResolvedValue(requestRow)
  mocks.repository.customerExists.mockResolvedValue({ id: 'crm_cus_1' })
  mocks.repository.create.mockResolvedValue(requestRow)
  mocks.repository.createFromIntake.mockResolvedValue({
    request: requestRow,
    submission: { id: 'crm_sub_1' },
  })
  mocks.repository.update.mockResolvedValue(requestRow)
  mocks.repository.remove.mockResolvedValue({
    object: 'request',
    id: requestRow.id,
    deleted: true,
  })
  mocks.repository.categoryExists.mockResolvedValue(null)
  mocks.repository.subcategoryExists.mockResolvedValue(null)
  mocks.repository.teamExists.mockResolvedValue({ id: 'crm_team_1' })
  mocks.repository.isTeamMember.mockResolvedValue(null)
  mocks.priorities.serialize.mockImplementation((row) => priorityWire(row))
  mocks.priorities.retrieveDefaultForTenant.mockResolvedValue(normalPriorityRow)
  mocks.priorities.requireActiveForTenant.mockImplementation(
    async (_tenantId: string, priorityId: string) =>
      priorityId === highPriorityRow.id ? highPriorityRow : normalPriorityRow
  )
})

describe('CRM request routes', () => {
  it('forwards request list filters including priorityId', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_1/requests?status=OPEN&teamId=crm_team_1&assigneeId=usr_2&customerId=crm_cus_1&categoryId=crm_cat_1&priorityId=${highPriorityRow.id}`
    )

    expect(response.status).toBe(200)
    expect(mocks.repository.list).toHaveBeenCalledWith(tenant.id, {
      status: 'OPEN',
      teamId: 'crm_team_1',
      assigneeId: 'usr_2',
      customerId: 'crm_cus_1',
      categoryId: 'crm_cat_1',
      priorityId: highPriorityRow.id,
    })
    expect(response.body.data.data[0]).toMatchObject({
      priorityId: normalPriorityRow.id,
      priority: { id: normalPriorityRow.id, name: 'Normal' },
    })
  })

  it('rejects the removed priority query parameter', async () => {
    // Priorities are tenant rows now, so `?priority=HIGH` is an unknown key on
    // a strict schema. It must be refused rather than silently ignored, which
    // would hand back an unfiltered queue that looks like a filtered one.
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests?priority=HIGH'
    )

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('crm/invalid-request')
    expect(mocks.repository.list).not.toHaveBeenCalled()
  })

  it('creates a request using the tenant default when no priority is explicit', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_1/requests',
      {
        customerId: 'crm_cus_1',
        subject: 'Need help',
        createdBy: 'usr_1',
      }
    )

    expect(response.status).toBe(201)
    expect(mocks.priorities.retrieveDefaultForTenant).toHaveBeenCalledWith(
      tenant.id
    )
    expect(mocks.repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      priorityId: normalPriorityRow.id,
    })
  })

  it('uses an explicit active priority over every routing default', async () => {
    mocks.repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: null,
      defaultPriorityId: normalPriorityRow.id,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      categoryId: 'crm_cat_1',
      priorityId: highPriorityRow.id,
      createdBy: 'usr_1',
    })

    expect(mocks.priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      highPriorityRow.id
    )
    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: highPriorityRow.id })
    )
  })

  it('uses a subcategory default before a category default', async () => {
    mocks.repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: null,
      defaultPriorityId: normalPriorityRow.id,
    })
    mocks.repository.subcategoryExists.mockResolvedValue({
      id: 'crm_subcat_1',
      categoryId: 'crm_cat_1',
      defaultTeamId: null,
      defaultPriorityId: highPriorityRow.id,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      categoryId: 'crm_cat_1',
      subcategoryId: 'crm_subcat_1',
      createdBy: 'usr_1',
    })

    expect(mocks.priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      highPriorityRow.id
    )
    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: highPriorityRow.id })
    )
  })

  it('uses the category default when no subcategory default exists', async () => {
    mocks.repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: null,
      defaultPriorityId: highPriorityRow.id,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      categoryId: 'crm_cat_1',
      createdBy: 'usr_1',
    })

    expect(mocks.priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      highPriorityRow.id
    )
    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: highPriorityRow.id })
    )
  })

  it('applies a category default team only when the caller did not select one', async () => {
    mocks.repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: 'crm_team_1',
      defaultPriorityId: null,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
    })

    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'crm_cat_1',
        teamId: 'crm_team_1',
        priorityId: normalPriorityRow.id,
      })
    )
  })

  it('keeps an explicitly selected team over a category default', async () => {
    mocks.repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: 'crm_team_1',
      defaultPriorityId: null,
    })

    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      teamId: 'crm_team_2',
    })

    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'crm_team_2' })
    )
  })

  it('rejects a subcategory belonging to another category', async () => {
    mocks.repository.categoryExists.mockResolvedValue({ id: 'crm_cat_1' })
    mocks.repository.subcategoryExists.mockResolvedValue({
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
    ).resolves.toMatchObject({
      code: 'crm/subcategory-category-mismatch',
      httpStatus: 422,
    })
    expect(mocks.repository.create).not.toHaveBeenCalled()
  })

  it('validates an updated priority as active for the tenant', async () => {
    await requestsService.update('org_1', requestRow.id, {
      priorityId: highPriorityRow.id,
    })

    expect(mocks.priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      highPriorityRow.id
    )
    expect(mocks.repository.update).toHaveBeenCalledWith(requestRow.id, {
      priorityId: highPriorityRow.id,
    })
  })

  it('clears an assignee who is not a member of a newly selected team', async () => {
    mocks.repository.retrieve.mockResolvedValue({
      ...requestRow,
      assigneeId: 'usr_2',
    })

    await requestsService.update('org_1', requestRow.id, {
      teamId: 'crm_team_2',
    })

    expect(mocks.repository.update).toHaveBeenCalledWith(requestRow.id, {
      teamId: 'crm_team_2',
      assigneeId: null,
    })
  })

  it('keeps an assignee who belongs to the newly selected team', async () => {
    mocks.repository.isTeamMember.mockResolvedValue({ id: 'crm_tmem_1' })
    mocks.repository.retrieve.mockResolvedValue({
      ...requestRow,
      assigneeId: 'usr_2',
    })

    await requestsService.update('org_1', requestRow.id, {
      teamId: 'crm_team_2',
    })

    expect(mocks.repository.update).toHaveBeenCalledWith(requestRow.id, {
      teamId: 'crm_team_2',
    })
  })

  it('stamps resolution and closure lifecycle dates', async () => {
    await requestsService.update('org_1', requestRow.id, { status: 'RESOLVED' })
    expect(mocks.repository.update).toHaveBeenCalledWith(requestRow.id, {
      status: 'RESOLVED',
      resolvedAt: expect.any(Date),
    })

    mocks.repository.retrieve.mockResolvedValue({
      ...requestRow,
      resolvedAt: new Date(),
    })
    await requestsService.update('org_1', requestRow.id, { status: 'CLOSED' })
    expect(mocks.repository.update).toHaveBeenLastCalledWith(
      requestRow.id,
      expect.objectContaining({
        status: 'CLOSED',
        resolvedAt: null,
        closedAt: expect.any(Date),
      })
    )
  })

  it('serializes requester identity and priority metadata', async () => {
    const { body } = await requestJson(
      'GET',
      `/v1/organizations/org_1/requests/${requestRow.id}`
    )

    expect(body.data).toMatchObject({
      requesterUserId: 'usr_requester_1',
      requesterContactId: 'con_1',
      priorityId: normalPriorityRow.id,
      priority: { id: normalPriorityRow.id, name: 'Normal' },
    })
  })

  it('persists and clears requester identities', async () => {
    await requestsService.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Cannot sign in',
      requesterUserId: 'usr_requester_1',
      requesterContactId: 'con_1',
      createdBy: 'usr_1',
    })
    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterUserId: 'usr_requester_1',
        requesterContactId: 'con_1',
      })
    )

    await requestsService.update('org_1', requestRow.id, {
      requesterUserId: null,
      requesterContactId: null,
    })
    expect(mocks.repository.update).toHaveBeenCalledWith(requestRow.id, {
      requesterUserId: null,
      requesterContactId: null,
    })
  })

  it('returns the normal list envelope', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          expect.objectContaining({ object: 'request', id: requestRow.id }),
        ],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/requests',
      },
      error: null,
    })
  })
})
