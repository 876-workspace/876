import { describe, expect, it } from 'vitest'
import {
  crmRequestNoteSchema,
  teamSchema,
  teamMemberSchema,
  requestCategorySchema,
  requestSubcategorySchema,
  requestPrioritySchema,
  requestPriorityListSchema,
  requestTaskSchema,
  requestReminderSchema,
  teamListSchema,
  requestCategoryListSchema,
  requestTaskListSchema,
  requestReminderListSchema,
  customerProfileSchema,
} from './types.js'
import { crmRequestSchema, requestListSchema } from './request-types.js'

const priority = {
  object: 'request_priority',
  id: 'crm_pri_normal',
  tenantId: 'crm_tenant_1',
  provisioningKey: 'normal',
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: '#64748b',
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: null,
  createdAt: 1,
  updatedAt: 1,
}

const request = {
  object: 'request',
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: 'crm_cat_1',
  subcategoryId: null,
  status: 'OPEN',
  priorityId: priority.id,
  priority,
  channel: 'AGENT',
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

describe('types - request priority schemas', () => {
  it('parses tenant-owned priority resources and lists', () => {
    expect(requestPrioritySchema.safeParse(priority).success).toBe(true)
    expect(
      requestPriorityListSchema.safeParse({
        object: 'list',
        data: [priority],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-priorities',
      }).success
    ).toBe(true)
  })

  it('rejects the removed string priority contract', () => {
    expect(requestPrioritySchema.safeParse('NORMAL').success).toBe(false)
  })
})

describe('types - crmRequestSchema', () => {
  it('parses a request with its stable priority id and resource', () => {
    expect(crmRequestSchema.safeParse(request).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(
      crmRequestSchema.safeParse({ ...request, status: 'UNKNOWN' }).success
    ).toBe(false)
  })

  it('rejects a request without priorityId', () => {
    const { priorityId: _priorityId, ...rest } = request
    expect(crmRequestSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects the legacy string priority payload', () => {
    expect(
      crmRequestSchema.safeParse({ ...request, priority: 'NORMAL' }).success
    ).toBe(false)
  })

  it('allows null categoryId and teamId', () => {
    expect(
      crmRequestSchema.safeParse({ ...request, categoryId: null, teamId: null })
        .success
    ).toBe(true)
  })

  it('parses every status enum value', () => {
    for (const status of [
      'OPEN',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'CLOSED',
      'CANCELLED',
    ]) {
      expect(crmRequestSchema.safeParse({ ...request, status }).success).toBe(
        true
      )
    }
  })
})

describe('types - crmRequestNoteSchema email metadata', () => {
  const base = {
    object: 'request_note',
    id: 'crm_note_1',
    tenantId: 'crm_tenant_1',
    requestId: 'crm_req_1',
    body: 'hi',
    authorId: 'usr_1',
    internal: true,
    visibility: 'INTERNAL',
    kind: 'NOTE',
    editedAt: null,
    createdAt: 1,
    updatedAt: 1,
  }

  it('parses NOTE without email fields', () => {
    expect(crmRequestNoteSchema.safeParse(base).success).toBe(true)
  })

  it('parses EMAIL with direction and address arrays', () => {
    expect(
      crmRequestNoteSchema.safeParse({
        ...base,
        kind: 'EMAIL',
        emailMessageId: 'mid',
        emailDirection: 'INBOUND',
        emailFrom: 'a@b.com',
        emailTo: ['x@y.com'],
        emailCc: [],
        emailSubject: 'Hi',
      }).success
    ).toBe(true)
  })

  it('rejects invalid kind', () => {
    expect(
      crmRequestNoteSchema.safeParse({ ...base, kind: 'CHAT' }).success
    ).toBe(false)
  })
})

describe('types - team schemas', () => {
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
    members: [member],
  }

  it('parses team with and without members', () => {
    expect(teamSchema.safeParse(team).success).toBe(true)
    const { members: _members, ...withoutMembers } = team
    expect(teamSchema.safeParse(withoutMembers).success).toBe(true)
  })

  it('validates auto assignment and member roles', () => {
    expect(
      teamSchema.safeParse({ ...team, autoAssign: 'RANDOM' }).success
    ).toBe(false)
    expect(
      teamMemberSchema.safeParse({ ...member, role: 'LEAD' }).success
    ).toBe(true)
    expect(
      teamMemberSchema.safeParse({ ...member, role: 'ADMIN' }).success
    ).toBe(false)
  })
})

describe('types - category schemas', () => {
  const subcategory = {
    object: 'request_subcategory',
    id: 'crm_sub_1',
    tenantId: 'crm_tenant_1',
    categoryId: 'crm_cat_1',
    provisioningKey: null,
    name: 'Damaged',
    slug: 'damaged',
    description: null,
    icon: 'package-x',
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriorityId: priority.id,
    createdBy: 'usr_1',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
  }
  const category = {
    object: 'request_category',
    id: 'crm_cat_1',
    tenantId: 'crm_tenant_1',
    provisioningKey: 'support',
    name: 'Delivery',
    slug: 'delivery',
    description: null,
    color: null,
    icon: 'package',
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriorityId: priority.id,
    createdBy: null,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
    subcategories: [subcategory],
  }

  it('parses category and subcategory priority references', () => {
    expect(requestCategorySchema.safeParse(category).success).toBe(true)
    expect(requestSubcategorySchema.safeParse(subcategory).success).toBe(true)
  })

  it('rejects the removed defaultPriority field as a substitute for the id', () => {
    const { defaultPriorityId: _defaultPriorityId, ...withoutId } = subcategory
    expect(
      requestSubcategorySchema.safeParse({
        ...withoutId,
        defaultPriority: 'HIGH',
      }).success
    ).toBe(false)
  })
})

describe('types - task and reminder', () => {
  const task = {
    object: 'request_task',
    id: 'crm_task_1',
    tenantId: 'crm_tenant_1',
    requestId: 'crm_req_1',
    title: 'Call',
    description: null,
    status: 'OPEN',
    priorityId: priority.id,
    priority,
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
  const reminder = {
    object: 'request_reminder',
    id: 'crm_rem_1',
    tenantId: 'crm_tenant_1',
    requestId: 'crm_req_1',
    title: 'Ping',
    note: null,
    remindAt: 2,
    userId: 'usr_2',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
  }

  it('parses task with its priority resource', () => {
    expect(requestTaskSchema.safeParse(task).success).toBe(true)
  })

  it('rejects invalid task status', () => {
    expect(
      requestTaskSchema.safeParse({ ...task, status: 'UNKNOWN' }).success
    ).toBe(false)
  })

  it('parses reminder and rejects invalid reminder status', () => {
    expect(requestReminderSchema.safeParse(reminder).success).toBe(true)
    expect(
      requestReminderSchema.safeParse({ ...reminder, status: 'UNKNOWN' })
        .success
    ).toBe(false)
  })
})

describe('types - list schemas and customer', () => {
  it('parses request, category, task, team, and reminder lists', () => {
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
    const category = {
      object: 'request_category',
      id: 'crm_cat_1',
      tenantId: 'crm_tenant_1',
      provisioningKey: null,
      name: 'Delivery',
      slug: 'delivery',
      description: null,
      color: null,
      icon: null,
      sortOrder: 0,
      isActive: true,
      defaultTeamId: null,
      defaultPriorityId: null,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      subcategories: [],
    }
    const task = {
      object: 'request_task',
      id: 'crm_task_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      title: 'Call',
      description: null,
      status: 'OPEN',
      priorityId: priority.id,
      priority,
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
    const reminder = {
      object: 'request_reminder',
      id: 'crm_rem_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      title: 'Ping',
      note: null,
      remindAt: 2,
      userId: 'usr_2',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }

    for (const [schema, data] of [
      [requestListSchema, [request]],
      [teamListSchema, [team]],
      [requestCategoryListSchema, [category]],
      [requestTaskListSchema, [task]],
      [requestReminderListSchema, [reminder]],
    ] as const) {
      expect(
        schema.safeParse({
          object: 'list',
          data,
          has_more: false,
          total_count: 1,
          url: '/x',
        }).success
      ).toBe(true)
    }
  })

  it('parses customerProfile and rejects an invalid status', () => {
    const profile = {
      id: 'crm_cus_1',
      tenantId: 'crm_tenant_1',
      billingCustomerId: 'cus_1',
      ownerId: null,
      status: 'ACTIVE',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    }
    expect(customerProfileSchema.safeParse(profile).success).toBe(true)
    expect(
      customerProfileSchema.safeParse({ ...profile, status: 'UNKNOWN' }).success
    ).toBe(false)
  })
})
