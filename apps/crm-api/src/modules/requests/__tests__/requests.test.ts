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
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => repository)

const { createRequestsRouter } = await import('../requests.routes.js')

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
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-08-26T18:00:00.000Z'),
  updatedAt: new Date('2026-08-26T18:00:00.000Z'),
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown
) {
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
  repository.remove.mockResolvedValue({ object: 'request', id: 'crm_req_1', deleted: true })
  repository.listNotes.mockResolvedValue([])
  repository.createNote.mockResolvedValue({})
  repository.removeNote.mockResolvedValue({})
  repository.updateNote.mockResolvedValue({})
})

describe('CRM request routes', () => {
  it('forwards request list filters from the query string', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/requests?status=OPEN&teamId=dept_1&assigneeId=usr_2&customerId=crm_cus_1&category=SUPPORT&priority=HIGH'
    )

    expect(response.status).toBe(200)
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      status: 'OPEN',
      teamId: 'dept_1',
      assigneeId: 'usr_2',
      customerId: 'crm_cus_1',
      category: 'SUPPORT',
      priority: 'HIGH',
    })
    expect(response.body.data.data[0]).toMatchObject({
      teamId: null,
      assigneeId: null,
    })
  })

  it('accepts a teamId when creating a request', async () => {
    const response = await requestJson('POST', '/v1/organizations/org_1/requests', {
        customerId: 'crm_cus_1',
        subject: 'Need help',
        createdBy: 'usr_1',
        teamId: 'dept_1',
        assigneeId: 'usr_2',
      })

    expect(response.status).toBe(201)
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      customerId: 'crm_cus_1',
      subject: 'Need help',
      createdBy: 'usr_1',
      teamId: 'dept_1',
      assigneeId: 'usr_2',
    })
  })

  it('accepts a teamId when updating a request', async () => {
    const response = await requestJson('PATCH', '/v1/organizations/org_1/requests/crm_req_1', {
        teamId: null,
        assigneeId: 'usr_2',
      })

    expect(response.status).toBe(200)
    expect(repository.update).toHaveBeenCalledWith('crm_req_1', {
      teamId: null,
      assigneeId: 'usr_2',
    })
  })
})
