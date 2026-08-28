import { describe, expect, it } from 'vitest'

import {
  requestPrioritySchema,
  requestPriorityListSchema,
  requestCategorySchema,
  requestSubcategorySchema,
  requestTaskSchema,
  crmRequestSchema,
} from './types.js'

describe('types.priority.advanced - requestPrioritySchema', () => {
  const valid = {
    object: 'request_priority' as const,
    id: 'crm_pri_1',
    tenantId: 'crm_tnt_1',
    provisioningKey: null,
    name: 'Normal',
    slug: 'normal',
    description: null,
    color: null,
    icon: null,
    weight: 20,
    sortOrder: 20,
    isDefault: true,
    isActive: true,
    createdBy: 'usr_1',
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
  }

  it('parses valid priority', () => {
    expect(requestPrioritySchema.parse(valid)).toEqual(valid)
  })

  it('accepts provisioningKey string and null', () => {
    expect(
      requestPrioritySchema.parse({ ...valid, provisioningKey: 'normal' })
        .provisioningKey
    ).toBe('normal')
    expect(
      requestPrioritySchema.parse({ ...valid, provisioningKey: null })
        .provisioningKey
    ).toBeNull()
  })

  it('rejects missing required fields', () => {
    expect(() =>
      requestPrioritySchema.parse({
        ...valid,
        name: undefined,
      } as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() =>
      requestPrioritySchema.parse({ ...valid, id: '' } as unknown as Record<
        string,
        unknown
      >)
    ).not.toThrow() // id allows any string? actually no min, but check
  })

  it('rejects wrong object literal', () => {
    expect(() =>
      requestPrioritySchema.parse({
        ...valid,
        object: 'request',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })

  it('validates weight and sortOrder ints', () => {
    expect(() =>
      requestPrioritySchema.parse({ ...valid, weight: 1.5 })
    ).toThrow()
    expect(() =>
      requestPrioritySchema.parse({
        ...valid,
        sortOrder: '20' as unknown as number,
      })
    ).toThrow()
  })
})

describe('types.priority.advanced - requestPriorityListSchema', () => {
  it('parses list with has_more and url', () => {
    const list = {
      object: 'list' as const,
      data: [],
      has_more: false,
      total_count: 0,
      url: '/v1/organizations/org_1/request-priorities',
    }
    expect(requestPriorityListSchema.parse(list)).toEqual(list)
  })

  it('parses list with priorities', () => {
    const pri = {
      object: 'request_priority' as const,
      id: 'crm_pri_1',
      tenantId: 'crm_tnt_1',
      provisioningKey: null,
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
      createdAt: 1,
      updatedAt: 1,
    }
    const list = {
      object: 'list' as const,
      data: [pri],
      has_more: false,
      total_count: 1,
      url: '/v1/x',
    }
    expect(requestPriorityListSchema.parse(list).data).toHaveLength(1)
  })
})

describe('types.priority.advanced - requestCategory uses priorityId', () => {
  it('accepts defaultPriorityId and strips legacy defaultPriority', () => {
    const cat = {
      object: 'request_category' as const,
      id: 'crm_cat_1',
      tenantId: 'crm_tnt_1',
      name: 'Billing',
      slug: 'billing',
      description: null,
      color: null,
      icon: null,
      sortOrder: 10,
      isActive: true,
      defaultTeamId: null,
      defaultPriorityId: 'crm_pri_normal',
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      subcategories: [],
    }
    expect(requestCategorySchema.parse(cat).defaultPriorityId).toBe(
      'crm_pri_normal'
    )
    const stripped = requestCategorySchema.parse({
      ...cat,
      defaultPriority: 'HIGH',
    } as unknown as Record<string, unknown>) as Record<string, unknown>
    expect(stripped.defaultPriority).toBeUndefined()
  })

  it('accepts null defaultPriorityId', () => {
    const cat = {
      object: 'request_category' as const,
      id: 'crm_cat_1',
      tenantId: 'crm_tnt_1',
      name: 'Billing',
      slug: 'billing',
      description: null,
      color: null,
      icon: null,
      sortOrder: 10,
      isActive: true,
      defaultTeamId: null,
      defaultPriorityId: null,
      createdBy: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      subcategories: [],
    }
    expect(requestCategorySchema.parse(cat).defaultPriorityId).toBeNull()
  })
})

describe('types.priority.advanced - requestTask uses priorityId + embedded priority', () => {
  it('parses task with priority object', () => {
    const pri = {
      object: 'request_priority' as const,
      id: 'crm_pri_1',
      tenantId: 'crm_tnt_1',
      provisioningKey: null,
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
      createdAt: 1,
      updatedAt: 1,
    }
    const task = {
      object: 'request_task' as const,
      id: 'crm_task_1',
      tenantId: 'crm_tnt_1',
      requestId: 'crm_req_1',
      title: 'Do',
      description: null,
      status: 'OPEN' as const,
      priorityId: 'crm_pri_1',
      priority: pri,
      assigneeId: null,
      dueAt: null,
      completedAt: null,
      completedBy: null,
      sortOrder: 0,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    expect(requestTaskSchema.parse(task).priorityId).toBe('crm_pri_1')
    expect(requestTaskSchema.parse(task).priority.name).toBe('Normal')
  })

  it('rejects legacy priority enum', () => {
    const pri = {
      object: 'request_priority' as const,
      id: 'crm_pri_1',
      tenantId: 'crm_tnt_1',
      provisioningKey: null,
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
      createdAt: 1,
      updatedAt: 1,
    }
    const task = {
      object: 'request_task' as const,
      id: 'crm_task_1',
      tenantId: 'crm_tnt_1',
      requestId: 'crm_req_1',
      title: 'Do',
      description: null,
      status: 'OPEN' as const,
      priorityId: 'crm_pri_1',
      priority: 'HIGH' as unknown as Record<string, unknown>,
      assigneeId: null,
      dueAt: null,
      completedAt: null,
      completedBy: null,
      sortOrder: 0,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    expect(() =>
      requestTaskSchema.parse(task as unknown as Record<string, unknown>)
    ).toThrow()
  })
})

describe('types.priority.advanced - crmRequest uses priorityId + priority object', () => {
  it('parses request with priorityId and embedded priority', () => {
    const pri = {
      object: 'request_priority' as const,
      id: 'crm_pri_1',
      tenantId: 'crm_tnt_1',
      provisioningKey: null,
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
      createdAt: 1,
      updatedAt: 1,
    }
    const req = {
      object: 'request' as const,
      id: 'crm_req_1',
      tenantId: 'crm_tnt_1',
      customerId: 'crm_cus_1',
      number: 1,
      subject: 'hi',
      categoryId: null,
      subcategoryId: null,
      status: 'OPEN' as const,
      priorityId: 'crm_pri_1',
      priority: pri,
      source: 'CRM' as const,
      teamId: null,
      assigneeId: null,
      ownerId: null,
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      resolvedAt: null,
      closedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }
    expect(crmRequestSchema.parse(req).priorityId).toBe('crm_pri_1')
  })

  it('rejects legacy priority enum', () => {
    const req = {
      object: 'request' as const,
      id: 'crm_req_1',
      tenantId: 'crm_tnt_1',
      customerId: 'crm_cus_1',
      number: 1,
      subject: 'hi',
      categoryId: null,
      subcategoryId: null,
      status: 'OPEN' as const,
      priorityId: 'crm_pri_1',
      priority: 'HIGH' as unknown as Record<string, unknown>,
      source: 'CRM' as const,
      teamId: null,
      assigneeId: null,
      ownerId: null,
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      resolvedAt: null,
      closedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }
    expect(() =>
      crmRequestSchema.parse(req as unknown as Record<string, unknown>)
    ).toThrow()
  })
})

describe('types.priority.advanced - requestSubcategory', () => {
  it('accepts defaultPriorityId null', () => {
    const sub = {
      object: 'request_subcategory' as const,
      id: 'crm_sub_1',
      tenantId: 'crm_tnt_1',
      categoryId: 'crm_cat_1',
      name: 'Sub',
      slug: 'sub',
      description: null,
      icon: null,
      sortOrder: 0,
      isActive: true,
      defaultTeamId: null,
      defaultPriorityId: null,
      createdBy: null,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    expect(requestSubcategorySchema.parse(sub).defaultPriorityId).toBeNull()
  })
})
