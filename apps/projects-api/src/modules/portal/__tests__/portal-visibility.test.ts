import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  collaborationMod,
  commentsMod,
  discussionsMod,
  financeMod,
  issuesMod,
  timeMod,
  wikiMod,
  workStructureMod,
  attachmentsMod,
} = vi.hoisted(() => ({
  collaborationMod: { listActivityForScope: vi.fn() },
  commentsMod: { listVisibleComments: vi.fn() },
  discussionsMod: {
    listDiscussions: vi.fn(),
    retrieveDiscussion: vi.fn(),
    listPosts: vi.fn(),
  },
  financeMod: { listBilledInvoices: vi.fn() },
  issuesMod: { listVisibleIssues: vi.fn(), retrieveVisibleIssue: vi.fn() },
  timeMod: { listTimeEntries: vi.fn() },
  wikiMod: { listPages: vi.fn(), retrievePage: vi.fn() },
  workStructureMod: {
    listVisibleMilestones: vi.fn(),
    retrieveVisibleMilestone: vi.fn(),
    milestoneDetails: { listVisibleMilestoneComments: vi.fn() },
  },
  attachmentsMod: { listAttachmentLinks: vi.fn() },
}))

vi.mock('../../collaboration/index.js', () => collaborationMod)
vi.mock('../../comments/index.js', () => commentsMod)
vi.mock('../../discussions/index.js', () => discussionsMod)
vi.mock('../../finance/index.js', () => financeMod)
vi.mock('../../issues/index.js', () => issuesMod)
vi.mock('../../time/index.js', () => timeMod)
vi.mock('../../wiki/index.js', () => wikiMod)
vi.mock('../../work-structure/index.js', () => workStructureMod)
vi.mock('../attachment-links.service.js', () => attachmentsMod)

const service = await import('../portal.service.js')

function grant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cgt_1',
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    userId: 'usr_client',
    allowComments: true,
    allowDiscussions: true,
    allowFiles: true,
    allowTime: true,
    allowInvoices: true,
    allowWiki: true,
    invitedBy: 'usr_owner',
    revokedAt: null,
    createdAt: 1787767200n,
    updatedAt: 1787767200n,
    ...overrides,
  }
}

const scope = {
  organizationId: 'org_alpha',
  tenantId: 'ten_alpha',
  projectId: 'prj_alpha',
  grant: grant(),
  portalUserId: 'usr_client',
}

function issueRow(id: string) {
  return {
    id,
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    number: 7,
    identifier: 'ALPHA-7',
    title: 'Client visible issue',
    description: 'Details',
    status: 'doing',
    workflowStateId: null,
    typeKey: 'task',
    workItemTypeId: null,
    milestoneId: null,
    priority: 'high',
    assigneeUserId: 'usr_internal',
    creatorUserId: 'usr_owner',
    parentIssueId: null,
    estimate: 120,
    dueDate: null,
    position: 0,
    clientVisible: true,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    deletedAt: null,
    createdAt: 1787767200n,
    updatedAt: 1787767300n,
  }
}

function milestoneRow(id: string) {
  return {
    id,
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    key: 'phase-1',
    name: 'Phase 1',
    description: 'First phase',
    status: 'active',
    ownerUserId: 'usr_owner',
    startDate: 1787767200n,
    targetDate: 1787853600n,
    completedAt: null,
    position: 0,
    clientVisible: true,
    deletedAt: null,
    createdAt: 1787767200n,
    updatedAt: 1787767200n,
  }
}

function discussion(id: string, clientVisible: boolean) {
  return {
    object: 'projects.discussion',
    id,
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    title: `Thread ${id}`,
    body: 'Body',
    pinned: false,
    locked: false,
    clientVisible,
    authorUserId: 'usr_owner',
    postCount: 0,
    createdAt: 1787767200,
    updatedAt: 1787767200,
  }
}

function attachment(id: string, clientVisible: boolean) {
  return {
    id,
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    issueId: 'iss_1',
    milestoneId: null,
    url: `https://files.example/${id}.pdf`,
    name: `${id}.pdf`,
    clientVisible,
    createdBy: 'usr_owner',
    createdAt: 1787767200n,
    updatedAt: 1787767200n,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('portal work item visibility', () => {
  it('delegates issue reads to the visible-issues query with exact args', async () => {
    issuesMod.listVisibleIssues.mockResolvedValue({
      data: { items: [issueRow('iss_1')], hasMore: false },
      error: null,
    })

    const result = await service.listIssues(scope, { limit: 10 })

    expect(issuesMod.listVisibleIssues).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      { limit: 10 }
    )
    expect(result.error).toBeNull()
    expect(result.data?.items[0]).toEqual({
      object: 'portal.issue',
      id: 'iss_1',
      projectId: 'prj_alpha',
      identifier: 'ALPHA-7',
      title: 'Client visible issue',
      description: 'Details',
      status: 'doing',
      priority: 'high',
      milestoneId: null,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
  })

  it('propagates visible-issue query failures', async () => {
    issuesMod.listVisibleIssues.mockResolvedValue({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'No workspace', httpStatus: 404 },
    })

    const result = await service.listIssues(scope, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('propagates single-issue not-found errors', async () => {
    issuesMod.retrieveVisibleIssue.mockResolvedValue({
      data: null,
      error: { code: 'projects/issue-not-found', message: 'Missing', httpStatus: 404 },
    })

    const result = await service.retrieveIssue(scope, 'ALPHA-9')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(issuesMod.retrieveVisibleIssue).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'ALPHA-9'
    )
  })
})

describe('portal phase visibility', () => {
  it('delegates milestone reads to the visible-milestones query', async () => {
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [milestoneRow('mls_1')],
      error: null,
    })

    const result = await service.listMilestones(scope, {})

    expect(workStructureMod.listVisibleMilestones).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      {}
    )
    expect(result.error).toBeNull()
    expect(result.data?.items[0]).toMatchObject({
      object: 'portal.milestone',
      id: 'mls_1',
    })
    expect(result.data?.items[0]).not.toHaveProperty('ownerUserId')
  })

  it('propagates milestone query failures', async () => {
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'No workspace', httpStatus: 404 },
    })

    const result = await service.listMilestones(scope, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})

describe('portal comment gating', () => {
  it('denies issue comments when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowComments: false }) }

    const result = await service.listIssueComments(denied, 'ALPHA-7')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(commentsMod.listVisibleComments).not.toHaveBeenCalled()
  })

  it('denies milestone comments when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowComments: false }) }

    const result = await service.listMilestoneComments(denied, 'mls_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(workStructureMod.milestoneDetails.listVisibleMilestoneComments).not.toHaveBeenCalled()
  })

  it('maps issue comments without tenant internals', async () => {
    issuesMod.retrieveVisibleIssue.mockResolvedValue({
      data: issueRow('iss_1'),
      error: null,
    })
    commentsMod.listVisibleComments.mockResolvedValue({
      data: [
        {
          object: 'projects.comment',
          id: 'cmt_1',
          tenantId: 'ten_alpha',
          issueId: 'iss_1',
          authorUserId: 'usr_client',
          body: 'Looks good',
          createdAt: 1787767200,
          updatedAt: 1787767200,
        },
      ],
      error: null,
    })

    const result = await service.listIssueComments(scope, 'ALPHA-7')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'portal.comment',
        id: 'cmt_1',
        issueId: 'iss_1',
        authorUserId: 'usr_client',
        body: 'Looks good',
        createdAt: 1787767200,
        updatedAt: 1787767200,
      },
    ])
  })
})

describe('portal discussion and file visibility', () => {
  it('returns an empty page when every discussion is hidden', async () => {
    discussionsMod.listDiscussions.mockResolvedValue({
      data: { items: [discussion('dsc_hidden', false)], hasMore: true },
      error: null,
    })

    const result = await service.listDiscussions(scope, {})

    expect(result.error).toBeNull()
    expect(result.data?.items).toEqual([])
    expect(result.data?.hasMore).toBe(true)
  })

  it('propagates discussion query failures', async () => {
    discussionsMod.listDiscussions.mockResolvedValue({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'No workspace', httpStatus: 404 },
    })

    const result = await service.listDiscussions(scope, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('excludes hidden attachments while mapping visible ones', async () => {
    attachmentsMod.listAttachmentLinks.mockResolvedValue({
      data: {
        items: [attachment('att_vis', true), attachment('att_hidden', false)],
        hasMore: false,
      },
      error: null,
    })

    const result = await service.listAttachments(scope, {})

    expect(result.error).toBeNull()
    expect(result.data?.items.map((item) => item.id)).toEqual(['att_vis'])
    expect(result.data?.items[0]).toEqual({
      object: 'portal.attachment',
      id: 'att_vis',
      issueId: 'iss_1',
      milestoneId: null,
      url: 'https://files.example/att_vis.pdf',
      name: 'att_vis.pdf',
      createdAt: 1787767200,
    })
  })

  it('denies attachment reads when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowFiles: false }) }

    const result = await service.listAttachments(denied, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(attachmentsMod.listAttachmentLinks).not.toHaveBeenCalled()
  })
})

describe('portal wiki gating', () => {
  it('denies wiki page lists when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowWiki: false }) }

    const result = await service.listWikiPages(denied, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(wikiMod.listPages).not.toHaveBeenCalled()
  })

  it('denies single wiki reads when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowWiki: false }) }

    const result = await service.retrieveWikiPage(denied, 'kickoff')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(wikiMod.retrievePage).not.toHaveBeenCalled()
  })
})

describe('portal time rounding', () => {
  it('rounds fractional hours to two decimals', async () => {
    timeMod.listTimeEntries.mockResolvedValue({
      data: [
        { milestoneId: 'mls_1', durationMinutes: 1 },
        { milestoneId: 'mls_2', durationMinutes: 7 },
        { milestoneId: 'mls_3', durationMinutes: 61 },
      ],
      error: null,
    })
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [
        { id: 'mls_1', name: 'Phase 1' },
        { id: 'mls_2', name: 'Phase 2' },
        { id: 'mls_3', name: 'Phase 3' },
      ],
      error: null,
    })

    const result = await service.getTimeByPhase(scope)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { object: 'portal.phase-hours', milestoneId: 'mls_3', milestoneName: 'Phase 3', hours: 1.02 },
      { object: 'portal.phase-hours', milestoneId: 'mls_2', milestoneName: 'Phase 2', hours: 0.12 },
      { object: 'portal.phase-hours', milestoneId: 'mls_1', milestoneName: 'Phase 1', hours: 0.02 },
    ])
  })

  it('skips entries without durations and names unknown phases null', async () => {
    timeMod.listTimeEntries.mockResolvedValue({
      data: [
        { milestoneId: 'mls_unknown', durationMinutes: 60 },
        { milestoneId: null, durationMinutes: null },
      ],
      error: null,
    })
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [],
      error: null,
    })

    const result = await service.getTimeByPhase(scope)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'portal.phase-hours',
        milestoneId: 'mls_unknown',
        milestoneName: null,
        hours: 1,
      },
    ])
  })

  it('propagates time entry failures', async () => {
    timeMod.listTimeEntries.mockResolvedValue({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'No workspace', httpStatus: 404 },
    })

    const result = await service.getTimeByPhase(scope)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})

describe('portal invoice listing', () => {
  it('converts billed minutes to hours through the finance API', async () => {
    financeMod.listBilledInvoices.mockResolvedValue({
      data: [
        { invoiceId: 'inv_1', status: 'paid', billedMinutes: 90, entryCount: 2 },
        { invoiceId: 'inv_2', status: 'sent', billedMinutes: 1, entryCount: 1 },
      ],
      error: null,
    })

    const result = await service.listInvoices(scope)

    expect(financeMod.listBilledInvoices).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha'
    )
    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { object: 'portal.invoice', invoiceId: 'inv_1', status: 'paid', billedHours: 1.5, entryCount: 2 },
      { object: 'portal.invoice', invoiceId: 'inv_2', status: 'sent', billedHours: 0.02, entryCount: 1 },
    ])
  })

  it('returns an empty invoice list without cost fields', async () => {
    financeMod.listBilledInvoices.mockResolvedValue({ data: [], error: null })

    const result = await service.listInvoices(scope)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('denies invoice reads when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowInvoices: false }) }

    const result = await service.listInvoices(denied)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(financeMod.listBilledInvoices).not.toHaveBeenCalled()
  })

  it('propagates finance failures', async () => {
    financeMod.listBilledInvoices.mockResolvedValue({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'No workspace', httpStatus: 404 },
    })

    const result = await service.listInvoices(scope)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})

describe('portal activity filtering', () => {
  function activityItem(id: string, kind: string, subjectId: string) {
    return {
      id,
      kind,
      subjectType: 'work-item',
      subjectId,
      type: 'created',
      createdAt: 1787767200,
    }
  }

  it('keeps only events for visible subjects and drops unknown kinds', async () => {
    issuesMod.listVisibleIssues.mockResolvedValue({
      data: { items: [issueRow('iss_1')], hasMore: false },
      error: null,
    })
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [],
      error: null,
    })
    collaborationMod.listActivityForScope.mockResolvedValue({
      data: {
        items: [
          activityItem('evt_vis', 'issue-event', 'iss_1'),
          activityItem('evt_hidden', 'issue-event', 'iss_hidden'),
          activityItem('evt_phase', 'milestone-event', 'mls_hidden'),
          activityItem('evt_other', 'timesheet-event', 'tsh_1'),
        ],
        nextCursor: 'cursor_1',
        hasMore: true,
      },
      error: null,
    })

    const result = await service.listActivity(scope, {})

    expect(result.error).toBeNull()
    expect(result.data?.items.map((item) => item.id)).toEqual(['evt_vis'])
    expect(result.data?.items[0]).toMatchObject({
      object: 'portal.activity-item',
      kind: 'issue-event',
    })
    expect(result.data?.nextCursor).toBe('cursor_1')
    expect(result.data?.hasMore).toBe(true)
  })

  it('scopes the activity query to the portal tenant and project', async () => {
    issuesMod.listVisibleIssues.mockResolvedValue({
      data: { items: [], hasMore: false },
      error: null,
    })
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [],
      error: null,
    })
    collaborationMod.listActivityForScope.mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
      error: null,
    })

    await service.listActivity(scope, { cursor: 'cursor_9' })

    expect(collaborationMod.listActivityForScope).toHaveBeenCalledWith(
      'ten_alpha',
      'prj_alpha',
      { cursor: 'cursor_9' }
    )
  })
})
