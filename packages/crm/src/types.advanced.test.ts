import { describe, expect, it } from 'vitest'
import {
  crmRequestSchema,
  crmRequestNoteSchema,
  teamSchema,
  teamMemberSchema,
  requestCategorySchema,
  requestSubcategorySchema,
  requestTaskSchema,
  requestReminderSchema,
  requestListSchema,
  teamListSchema,
  requestCategoryListSchema,
  requestTaskListSchema,
  requestReminderListSchema,
  customerProfileSchema,
} from './types.js'

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
  priority: 'NORMAL',
  source: 'CRM',
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

describe('types - crmRequestSchema', () => {
  it('parses valid request', () => {
    expect(crmRequestSchema.safeParse(request).success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(
      crmRequestSchema.safeParse({ ...request, status: 'UNKNOWN' }).success
    ).toBe(false)
  })
  it('rejects missing required fields', () => {
    const { subject: _s, ...rest } = request as Record<string, unknown>
    expect(crmRequestSchema.safeParse(rest).success).toBe(false)
  })
  it('allows null categoryId and teamId', () => {
    expect(
      crmRequestSchema.safeParse({ ...request, categoryId: null, teamId: null })
        .success
    ).toBe(true)
  })
  it('parses every status enum value', () => {
    for (const s of [
      'OPEN',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'CLOSED',
      'CANCELLED',
    ]) {
      expect(
        crmRequestSchema.safeParse({ ...request, status: s }).success
      ).toBe(true)
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
    kind: 'NOTE',
    editedAt: null,
    createdAt: 1,
    updatedAt: 1,
  }
  it('parses NOTE without email fields', () => {
    expect(crmRequestNoteSchema.safeParse(base).success).toBe(true)
  })
  it('parses EMAIL with direction and address arrays', () => {
    const note = {
      ...base,
      kind: 'EMAIL',
      emailMessageId: 'mid',
      emailDirection: 'INBOUND',
      emailFrom: 'a@b.com',
      emailTo: ['x@y.com'],
      emailCc: [],
      emailSubject: 'Hi',
    }
    expect(crmRequestNoteSchema.safeParse(note).success).toBe(true)
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
  it('parses team with members', () => {
    expect(teamSchema.safeParse(team).success).toBe(true)
  })
  it('parses team without members', () => {
    const { members: _m, ...rest } = team as Record<string, unknown>
    expect(teamSchema.safeParse(rest).success).toBe(true)
  })
  it('rejects invalid autoAssign', () => {
    expect(
      teamSchema.safeParse({ ...team, autoAssign: 'RANDOM' }).success
    ).toBe(false)
  })
  it('parses every team status', () => {
    expect(teamSchema.safeParse({ ...team, status: 'ARCHIVED' }).success).toBe(
      true
    )
  })
  it('parses member role LEAD', () => {
    expect(
      teamMemberSchema.safeParse({ ...member, role: 'LEAD' }).success
    ).toBe(true)
  })
  it('rejects invalid member role', () => {
    expect(
      teamMemberSchema.safeParse({ ...member, role: 'ADMIN' }).success
    ).toBe(false)
  })
})

describe('types - category schemas', () => {
  const sub = {
    object: 'request_subcategory',
    id: 'crm_sub_1',
    tenantId: 'crm_tenant_1',
    categoryId: 'crm_cat_1',
    name: 'Damaged',
    slug: 'damaged',
    description: null,
    icon: 'package-x',
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriority: null,
    createdBy: 'usr_1',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
  }
  const cat = {
    object: 'request_category',
    id: 'crm_cat_1',
    tenantId: 'crm_tenant_1',
    name: 'Delivery',
    slug: 'delivery',
    description: null,
    color: null,
    icon: 'package',
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriority: null,
    createdBy: 'usr_1',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
    subcategories: [sub],
  }
  it('parses category with subcategories', () => {
    expect(requestCategorySchema.safeParse(cat).success).toBe(true)
  })
  it('rejects category without subcategories array', () => {
    const { subcategories: _s, ...rest } = cat as Record<string, unknown>
    expect(requestCategorySchema.safeParse(rest).success).toBe(false)
  })
  it('parses subcategory', () => {
    expect(requestSubcategorySchema.safeParse(sub).success).toBe(true)
  })
  it('rejects invalid priority on subcategory', () => {
    expect(
      requestSubcategorySchema.safeParse({
        ...sub,
        defaultPriority: 'CRITICAL',
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
    priority: 'NORMAL',
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
  it('parses task', () => {
    expect(requestTaskSchema.safeParse(task).success).toBe(true)
  })
  it('rejects invalid task status', () => {
    expect(
      requestTaskSchema.safeParse({ ...task, status: 'UNKNOWN' }).success
    ).toBe(false)
  })
  it('parses reminder', () => {
    expect(requestReminderSchema.safeParse(reminder).success).toBe(true)
  })
  it('rejects invalid reminder status', () => {
    expect(
      requestReminderSchema.safeParse({ ...reminder, status: 'UNKNOWN' })
        .success
    ).toBe(false)
  })
  it('parses every task status', () => {
    for (const s of ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']) {
      expect(requestTaskSchema.safeParse({ ...task, status: s }).success).toBe(
        true
      )
    }
  })
  it('parses every reminder status', () => {
    for (const s of ['SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED']) {
      expect(
        requestReminderSchema.safeParse({ ...reminder, status: s }).success
      ).toBe(true)
    }
  })
})

describe('types - list schemas and customer', () => {
  it('parses request list', () => {
    expect(
      requestListSchema.safeParse({
        object: 'list',
        data: [request],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/requests',
      }).success
    ).toBe(true)
  })
  it('parses team list', () => {
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
    expect(
      teamListSchema.safeParse({
        object: 'list',
        data: [team],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/teams',
      }).success
    ).toBe(true)
  })
  it('parses category list', () => {
    const cat = {
      object: 'request_category',
      id: 'crm_cat_1',
      tenantId: 'crm_tenant_1',
      name: 'Delivery',
      slug: 'delivery',
      description: null,
      color: null,
      icon: null,
      sortOrder: 0,
      isActive: true,
      defaultTeamId: null,
      defaultPriority: null,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      subcategories: [],
    }
    expect(
      requestCategoryListSchema.safeParse({
        object: 'list',
        data: [cat],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-categories',
      }).success
    ).toBe(true)
  })
  it('parses customerProfile', () => {
    expect(
      customerProfileSchema.safeParse({
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
      }).success
    ).toBe(true)
    expect(
      customerProfileSchema.safeParse({
        id: 'crm_cus_1',
        tenantId: 'crm_tenant_1',
        billingCustomerId: 'cus_1',
        ownerId: null,
        status: 'UNKNOWN' as unknown as never,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      }).success
    ).toBe(false)
  })
  it('parses task list and reminder list', () => {
    const task = {
      object: 'request_task',
      id: 'crm_task_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      title: 'Call',
      description: null,
      status: 'OPEN',
      priority: 'NORMAL',
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
    const rem = {
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
    expect(
      requestTaskListSchema.safeParse({
        object: 'list',
        data: [task],
        has_more: false,
        total_count: 1,
        url: '/x',
      }).success
    ).toBe(true)
    expect(
      requestReminderListSchema.safeParse({
        object: 'list',
        data: [rem],
        has_more: false,
        total_count: 1,
        url: '/x',
      }).success
    ).toBe(true)
  })
})
