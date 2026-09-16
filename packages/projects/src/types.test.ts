import { describe, expect, it } from 'vitest'

import {
  commentSchema,
  deletedSchema,
  issueEventSchema,
  issueListSchema,
  issueSchema,
  labelSchema,
  listEnvelopeSchema,
  projectMemberSchema,
  projectSchema,
  tenantSchema,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PROJECT_HEALTHS,
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
  type Issue,
} from './types'

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task_1',
  tenantId: 'ten_abc',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

const sampleState = {
  object: 'projects.workflow-state' as const,
  id: 'wfs_in_progress_1',
  tenantId: 'ten_abc',
  key: 'in-progress',
  name: 'In progress',
  category: 'started' as const,
  color: '#64748b',
  description: null,
  isDefault: false,
  position: 1,
  archivedAt: null,
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

const validIssue: Issue = {
  object: 'projects.issue',
  id: 'iss_123',
  tenantId: 'ten_abc',
  projectId: 'prj_xyz',
  projectKey: 'PROJ',
  number: 42,
  identifier: 'PROJ-42',
  title: 'Fix the bug',
  description: 'Detailed description',
  status: 'in-progress',
  typeKey: 'task',
  type: sampleType,
  state: sampleState,
  milestone: null,
  taskListId: null,
  cycleId: null,
  customFields: [],
  priority: 'high',
  assigneeUserId: 'usr_1',
  creatorUserId: 'usr_2',
  parentIssueId: null,
  estimate: 5,
  dueDate: 1700000000,
  plannedStartDate: null,
  plannedFinishDate: null,
  plannedDurationMinutes: null,
  blocked: false,
  relationCount: 0,
  dependencyCount: 0,
  position: 100,
  labels: [
    {
      object: 'projects.label',
      id: 'lbl_1',
      tenantId: 'ten_abc',
      name: 'bug',
      color: '#ff0000',
      description: 'Bug reports',
      createdAt: 1600000000,
      updatedAt: 1600000000,
    },
  ],
  commentCount: 2,
  subIssueCount: 0,
  startedAt: 1690000000,
  completedAt: null,
  canceledAt: null,
  createdAt: 1680000000,
  updatedAt: 1695000000,
}

describe('issueSchema', () => {
  it('issueSchema accepts a complete valid payload and infers the expected type', () => {
    const result = issueSchema.safeParse(validIssue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validIssue)
    }
  })

  it('issueSchema rejects a payload with the wrong object discriminator', () => {
    const invalid = { ...validIssue, object: 'wrong.issue' }
    const result = issueSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('issueSchema rejects a non-numeric timestamp', () => {
    const invalid = { ...validIssue, createdAt: '2026-09-03T00:00:00Z' }
    const result = issueSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('issueSchema accepts a tenant-defined workflow-state key as status', () => {
    const tenantDefined = { ...validIssue, status: 'awaiting-sign-off' }
    const result = issueSchema.safeParse(tenantDefined)
    expect(result.success).toBe(true)
  })

  it('issueSchema rejects an empty status value', () => {
    const invalid = { ...validIssue, status: '' }
    const result = issueSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('list envelope schemas', () => {
  it('the list envelope schema accepts total_count: null', () => {
    const listPayload = {
      object: 'list',
      data: [validIssue],
      has_more: false,
      total_count: null,
      url: '/v1/organizations/org_1/issues',
    }

    const envelopeResult = listEnvelopeSchema.safeParse(listPayload)
    expect(envelopeResult.success).toBe(true)
    if (envelopeResult.success) {
      expect(envelopeResult.data.total_count).toBeNull()
    }

    const typedResult = issueListSchema.safeParse(listPayload)
    expect(typedResult.success).toBe(true)
    if (typedResult.success) {
      expect(typedResult.data.total_count).toBeNull()
    }
  })
})

describe('enumerations', () => {
  it('ISSUE_STATUSES contains exactly the six kebab-case values in order', () => {
    expect(ISSUE_STATUSES).toEqual([
      'backlog',
      'todo',
      'in-progress',
      'in-review',
      'done',
      'canceled',
    ])
  })

  it('ISSUE_PRIORITIES contains exactly the five values in order', () => {
    expect(ISSUE_PRIORITIES).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'urgent',
    ])
  })

  it('PROJECT_STATUSES contains the five expected values in order', () => {
    expect(PROJECT_STATUSES).toEqual([
      'planned',
      'active',
      'paused',
      'completed',
      'canceled',
    ])
  })

  it('PROJECT_HEALTHS contains the three expected values in order', () => {
    expect(PROJECT_HEALTHS).toEqual(['on-track', 'at-risk', 'off-track'])
  })

  it('PROJECT_MEMBER_ROLES contains the three expected values in order', () => {
    expect(PROJECT_MEMBER_ROLES).toEqual(['lead', 'member', 'viewer'])
  })
})

describe('other schemas', () => {
  it('tenantSchema accepts a valid tenant payload', () => {
    const tenant = {
      object: 'projects.tenant',
      id: 'ten_1',
      organizationId: 'org_1',
      triageProjectId: 'prj_triage',
      createdAt: 1680000000,
      updatedAt: 1680000000,
    }
    const result = tenantSchema.safeParse(tenant)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(tenant)
    }
  })

  it('labelSchema accepts a valid label payload', () => {
    const label = {
      object: 'projects.label',
      id: 'lbl_1',
      tenantId: 'ten_1',
      name: 'frontend',
      color: '#3b82f6',
      description: null,
      createdAt: 1680000000,
      updatedAt: 1680000000,
    }
    const result = labelSchema.safeParse(label)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(label)
    }
  })

  it('commentSchema accepts a valid comment payload', () => {
    const comment = {
      object: 'projects.comment',
      id: 'cmt_1',
      tenantId: 'ten_1',
      issueId: 'iss_1',
      authorUserId: 'usr_1',
      body: 'Looking into this now.',
      createdAt: 1680000000,
      updatedAt: 1680000000,
    }
    const result = commentSchema.safeParse(comment)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(comment)
    }
  })

  it('issueEventSchema accepts a valid issue event payload', () => {
    const event = {
      object: 'projects.issue-event',
      id: 'evt_1',
      issueId: 'iss_1',
      actorUserId: 'usr_1',
      type: 'status_changed',
      fromValue: 'todo',
      toValue: 'in-progress',
      createdAt: 1680000000,
    }
    const result = issueEventSchema.safeParse(event)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(event)
    }
  })

  it('projectMemberSchema accepts a valid member payload', () => {
    const member = {
      object: 'projects.project-member',
      id: 'pm_1',
      projectId: 'prj_1',
      userId: 'usr_1',
      role: 'lead',
      createdAt: 1680000000,
    }
    const result = projectMemberSchema.safeParse(member)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(member)
    }
  })

  it('projectSchema accepts a valid project payload', () => {
    const project = {
      object: 'projects.project',
      id: 'prj_1',
      tenantId: 'ten_1',
      name: 'Platform',
      key: 'PLAT',
      slug: 'platform',
      description: 'Platform engineering',
      leadUserId: 'usr_lead',
      status: 'active',
      health: 'on-track',
      startDate: 1680000000,
      targetDate: 1700000000,
      nextIssueNumber: 15,
      customerId: null,
      defaultWorkItemTypeId: null,
      position: 1,
      archivedAt: null,
      createdAt: 1680000000,
      updatedAt: 1685000000,
      memberCount: 5,
      customFields: [],
    }
    const result = projectSchema.safeParse(project)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(project)
    }
  })

  it('deletedSchema accepts tombstone shape', () => {
    const tombstone = {
      object: 'projects.issue',
      id: 'iss_123',
      deleted: true,
    }
    const result = deletedSchema.safeParse(tombstone)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(tombstone)
    }
  })
})
