import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, priorities } = vi.hoisted(() => ({
  repository: { listAcrossOrganizations: vi.fn() },
  priorities: { serialize: vi.fn((priority: unknown) => priority) },
}))

vi.mock('../requests.repository.js', () => repository)
vi.mock('../../priorities/index.js', () => priorities)
vi.mock('../../tenants/tenants.service.js', () => ({}))

const service = await import('../requests.service.js')

const row = {
  id: 'req_1',
  tenantId: 'tenant_1',
  customerId: 'customer_1',
  number: 7,
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

beforeEach(() => {
  vi.clearAllMocks()
  repository.listAcrossOrganizations.mockResolvedValue([row])
})

describe('requests.service - listAcrossOrganizations', () => {
  it('serializes each request with its owning organization id', async () => {
    const result = await service.listAcrossOrganizations({ limit: 25 })

    expect(repository.listAcrossOrganizations).toHaveBeenCalledWith({
      limit: 25,
    })
    expect(result).toEqual({
      data: [
        {
          object: 'request',
          id: 'req_1',
          tenantId: 'tenant_1',
          customerId: 'customer_1',
          number: 7,
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
      hasMore: false,
    })
  })
})
