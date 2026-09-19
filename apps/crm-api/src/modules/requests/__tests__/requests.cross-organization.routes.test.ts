import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, priorities } = vi.hoisted(() => ({
  repository: { listAcrossOrganizations: vi.fn() },
  priorities: { serialize: vi.fn((priority: unknown) => priority) },
}))

vi.mock('../requests.repository.js', () => repository)
vi.mock('../../priorities/index.js', () => priorities)
vi.mock('../../tenants/tenants.service.js', () => ({}))
vi.mock('../../notes/notes.repository.js', () => ({}))

const { errorHandler } = await import('../../../http/error-handler.js')
const { createOperatorRequestsRouter } = await import('../requests.routes.js')

const row = {
  id: 'req_1',
  tenantId: 'tenant_1',
  customerId: 'customer_1',
  number: 1,
  subject: 'Access request',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN' as const,
  priorityId: 'priority_1',
  priority: { object: 'request_priority' as const, id: 'priority_1' },
  channel: 'AGENT' as const,
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: null,
  requesterContactId: null,
  createdBy: 'user_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-09-04T00:00:00.000Z'),
  updatedAt: new Date('2026-09-04T00:00:00.000Z'),
  tenant: { organizationId: 'org_1' },
}

function app() {
  const instance = express()
  instance.use('/v1/requests', createOperatorRequestsRouter())
  instance.use(errorHandler)
  return instance
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRM_INTERNAL_KEY = 'crm-internal-key'
  repository.listAcrossOrganizations.mockResolvedValue([row])
})

describe('cross-organization request route', () => {
  it('rejects callers without the internal key', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app()).get('/v1/requests')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
    expect(repository.listAcrossOrganizations).not.toHaveBeenCalled()
  })

  it('rejects an invalid status query', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app())
      .get('/v1/requests?status=INVALID')
      .set('x-internal-key', 'crm-internal-key')

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('crm/invalid-request')
    expect(repository.listAcrossOrganizations).not.toHaveBeenCalled()
  })

  it('returns the standard list envelope with organization ids', async () => {
    const { default: request } = await import('supertest')
    const response = await request(app())
      .get('/v1/requests?status=OPEN&limit=1')
      .set('x-internal-key', 'crm-internal-key')

    expect(repository.listAcrossOrganizations).toHaveBeenCalledWith({
      status: 'OPEN',
      limit: 1,
      startingAfter: undefined,
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'request',
            id: 'req_1',
            tenantId: 'tenant_1',
            customerId: 'customer_1',
            number: 1,
            subject: 'Access request',
            categoryId: null,
            subcategoryId: null,
            status: 'OPEN',
            priorityId: 'priority_1',
            priority: { object: 'request_priority', id: 'priority_1' },
            channel: 'AGENT',
            teamId: null,
            assigneeId: null,
            ownerId: null,
            requesterUserId: null,
            requesterContactId: null,
            createdBy: 'user_1',
            resolvedAt: null,
            closedAt: null,
            createdAt: 1788480000,
            updatedAt: 1788480000,
            organizationId: 'org_1',
          },
        ],
        has_more: false,
        total_count: 1,
        url: '/v1/requests',
      },
      error: null,
    })
  })
})
