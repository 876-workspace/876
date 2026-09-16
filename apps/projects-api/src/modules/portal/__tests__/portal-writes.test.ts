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
  commentsMod: {
    create: vi.fn(),
    setCommentVisibility: vi.fn(),
    listVisibleComments: vi.fn(),
  },
  discussionsMod: {
    listDiscussions: vi.fn(),
    retrieveDiscussion: vi.fn(),
    listPosts: vi.fn(),
    createPost: vi.fn(),
  },
  financeMod: { listBilledInvoices: vi.fn() },
  issuesMod: {
    listVisibleIssues: vi.fn(),
    retrieveVisibleIssue: vi.fn(),
  },
  timeMod: { listTimeEntries: vi.fn() },
  wikiMod: { listPages: vi.fn(), retrievePage: vi.fn() },
  workStructureMod: {
    listVisibleMilestones: vi.fn(),
    retrieveVisibleMilestone: vi.fn(),
    milestoneDetails: {
      listVisibleMilestoneComments: vi.fn(),
      createComment: vi.fn(),
      setMilestoneCommentVisibility: vi.fn(),
    },
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

function makeScope(grantOverrides: Record<string, unknown> = {}) {
  const nextGrant = grant(grantOverrides)
  return {
    organizationId: 'org_alpha',
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    grant: nextGrant,
    portalUserId: 'usr_client',
  }
}

const scope = makeScope()

function visibleIssue() {
  return {
    id: 'iss_1',
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    number: 7,
    identifier: 'ALPHA-7',
    title: 'Client visible issue',
    description: 'Details',
    status: 'doing',
    priority: 'high',
    milestoneId: null,
    clientVisible: true,
    deletedAt: null,
    createdAt: 1787767200n,
    updatedAt: 1787767300n,
  }
}

function visibleMilestone() {
  return {
    id: 'mls_1',
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

function visibleDiscussion(overrides: Record<string, unknown> = {}) {
  return {
    object: 'projects.discussion',
    id: 'dsc_1',
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    title: 'Thread dsc_1',
    body: 'Body',
    pinned: false,
    locked: false,
    clientVisible: true,
    authorUserId: 'usr_owner',
    postCount: 0,
    createdAt: 1787767200,
    updatedAt: 1787767200,
    ...overrides,
  }
}

function notFound(code: string) {
  return { code, message: 'Not found.', httpStatus: 404 }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('portal issue comment writes', () => {
  function arrangeIssueSuccess() {
    issuesMod.retrieveVisibleIssue.mockResolvedValue({
      data: visibleIssue(),
      error: null,
    })
    commentsMod.create.mockResolvedValue({
      data: {
        object: 'projects.comment',
        id: 'cmt_1',
        tenantId: 'ten_alpha',
        issueId: 'iss_1',
        authorUserId: 'usr_client',
        body: 'Hello from portal',
        createdAt: 1787767400,
        updatedAt: 1787767400,
      },
      error: null,
    })
    commentsMod.setCommentVisibility.mockResolvedValue({
      data: { object: 'projects.comment', id: 'cmt_1', clientVisible: true },
      error: null,
    })
  }

  it('creates the issue comment with the portal user as author', async () => {
    arrangeIssueSuccess()

    const result = await service.createIssueComment(scope, 'ALPHA-7', {
      body: 'Hello from portal',
    })

    expect(result.error).toBeNull()
    expect(issuesMod.retrieveVisibleIssue).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'ALPHA-7'
    )
    expect(commentsMod.create).toHaveBeenCalledWith(
      'org_alpha',
      'ALPHA-7',
      { body: 'Hello from portal', authorUserId: 'usr_client' }
    )
    expect(result.data?.authorUserId).toBe('usr_client')
  })

  it('marks the created issue comment client-visible', async () => {
    arrangeIssueSuccess()

    await service.createIssueComment(scope, 'ALPHA-7', {
      body: 'Hello from portal',
    })

    expect(commentsMod.setCommentVisibility).toHaveBeenCalledWith(
      'org_alpha',
      'ALPHA-7',
      'cmt_1',
      true
    )
  })

  it('returns the exact portal.comment key set', async () => {
    arrangeIssueSuccess()

    const result = await service.createIssueComment(scope, 'ALPHA-7', {
      body: 'Hello from portal',
    })

    expect(result.error).toBeNull()
    expect(Object.keys(result.data ?? {}).sort()).toEqual(
      [
        'authorUserId',
        'body',
        'createdAt',
        'id',
        'issueId',
        'object',
        'updatedAt',
      ].sort()
    )
    expect(result.data).toEqual({
      object: 'portal.comment',
      id: 'cmt_1',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Hello from portal',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    })
  })

  it('reads a non-visible issue as 404 without writing', async () => {
    issuesMod.retrieveVisibleIssue.mockResolvedValue({
      data: null,
      error: notFound('projects/issue-not-found'),
    })

    const result = await service.createIssueComment(scope, 'ALPHA-9', {
      body: 'Hello',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(result.error?.httpStatus).toBe(404)
    expect(commentsMod.create).not.toHaveBeenCalled()
    expect(commentsMod.setCommentVisibility).not.toHaveBeenCalled()
  })

  it('reads an issue from another project as 404 without writing', async () => {
    issuesMod.retrieveVisibleIssue.mockResolvedValue({
      data: null,
      error: notFound('projects/issue-not-found'),
    })

    const result = await service.createIssueComment(scope, 'OTHER-1', {
      body: 'Hello',
    })

    expect(issuesMod.retrieveVisibleIssue).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'OTHER-1'
    )
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(commentsMod.create).not.toHaveBeenCalled()
  })

  it('reads a revoked grant as 404 without writing', async () => {
    const revoked = makeScope({ revokedAt: 1787767500n })

    const result = await service.createIssueComment(revoked, 'ALPHA-7', {
      body: 'Hello',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/client-grant-not-found')
    expect(result.error?.httpStatus).toBe(404)
    expect(issuesMod.retrieveVisibleIssue).not.toHaveBeenCalled()
    expect(commentsMod.create).not.toHaveBeenCalled()
  })

  it('denies issue comments when the grant flag is off', async () => {
    const denied = makeScope({ allowComments: false })

    const result = await service.createIssueComment(denied, 'ALPHA-7', {
      body: 'Hello',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(issuesMod.retrieveVisibleIssue).not.toHaveBeenCalled()
    expect(commentsMod.create).not.toHaveBeenCalled()
  })
})

describe('portal milestone comment writes', () => {
  function arrangeMilestoneSuccess() {
    workStructureMod.retrieveVisibleMilestone.mockResolvedValue({
      data: visibleMilestone(),
      error: null,
    })
    workStructureMod.milestoneDetails.createComment.mockResolvedValue({
      data: {
        object: 'projects.milestone-comment',
        id: 'mcm_1',
        milestoneId: 'mls_1',
        authorUserId: 'usr_client',
        body: 'Phase note',
        createdAt: 1787767400,
        updatedAt: 1787767400,
      },
      error: null,
    })
    workStructureMod.milestoneDetails.setMilestoneCommentVisibility.mockResolvedValue(
      {
        data: {
          object: 'projects.milestone-comment',
          id: 'mcm_1',
          clientVisible: true,
        },
        error: null,
      }
    )
  }

  it('creates the milestone comment with the portal user as author', async () => {
    arrangeMilestoneSuccess()

    const result = await service.createMilestoneComment(scope, 'mls_1', {
      body: 'Phase note',
    })

    expect(result.error).toBeNull()
    expect(
      workStructureMod.retrieveVisibleMilestone
    ).toHaveBeenCalledWith('org_alpha', 'prj_alpha', 'mls_1')
    expect(
      workStructureMod.milestoneDetails.createComment
    ).toHaveBeenCalledWith('org_alpha', 'mls_1', {
      body: 'Phase note',
      authorUserId: 'usr_client',
    })
    expect(result.data?.authorUserId).toBe('usr_client')
  })

  it('marks the created milestone comment client-visible', async () => {
    arrangeMilestoneSuccess()

    await service.createMilestoneComment(scope, 'mls_1', {
      body: 'Phase note',
    })

    expect(
      workStructureMod.milestoneDetails.setMilestoneCommentVisibility
    ).toHaveBeenCalledWith('org_alpha', 'mls_1', 'mcm_1', true)
  })

  it('returns the exact portal.milestone-comment key set', async () => {
    arrangeMilestoneSuccess()

    const result = await service.createMilestoneComment(scope, 'mls_1', {
      body: 'Phase note',
    })

    expect(result.error).toBeNull()
    expect(Object.keys(result.data ?? {}).sort()).toEqual(
      [
        'authorUserId',
        'body',
        'createdAt',
        'id',
        'milestoneId',
        'object',
        'updatedAt',
      ].sort()
    )
    expect(result.data).toEqual({
      object: 'portal.milestone-comment',
      id: 'mcm_1',
      milestoneId: 'mls_1',
      authorUserId: 'usr_client',
      body: 'Phase note',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    })
  })

  it('reads a non-visible milestone as 404 without writing', async () => {
    workStructureMod.retrieveVisibleMilestone.mockResolvedValue({
      data: null,
      error: notFound('projects/milestone-not-found'),
    })

    const result = await service.createMilestoneComment(scope, 'mls_hidden', {
      body: 'Phase note',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/milestone-not-found')
    expect(result.error?.httpStatus).toBe(404)
    expect(
      workStructureMod.milestoneDetails.createComment
    ).not.toHaveBeenCalled()
  })

  it('reads a milestone from another project as 404 without writing', async () => {
    workStructureMod.retrieveVisibleMilestone.mockResolvedValue({
      data: null,
      error: notFound('projects/milestone-not-found'),
    })

    const result = await service.createMilestoneComment(scope, 'mls_other', {
      body: 'Phase note',
    })

    expect(
      workStructureMod.retrieveVisibleMilestone
    ).toHaveBeenCalledWith('org_alpha', 'prj_alpha', 'mls_other')
    expect(result.error?.code).toBe('projects/milestone-not-found')
    expect(
      workStructureMod.milestoneDetails.createComment
    ).not.toHaveBeenCalled()
  })

  it('reads a revoked grant as 404 without writing', async () => {
    const revoked = makeScope({ revokedAt: 1787767500n })

    const result = await service.createMilestoneComment(revoked, 'mls_1', {
      body: 'Phase note',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/client-grant-not-found')
    expect(
      workStructureMod.retrieveVisibleMilestone
    ).not.toHaveBeenCalled()
    expect(
      workStructureMod.milestoneDetails.createComment
    ).not.toHaveBeenCalled()
  })

  it('denies milestone comments when the grant flag is off', async () => {
    const denied = makeScope({ allowComments: false })

    const result = await service.createMilestoneComment(denied, 'mls_1', {
      body: 'Phase note',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(
      workStructureMod.milestoneDetails.createComment
    ).not.toHaveBeenCalled()
  })
})

describe('portal discussion post writes', () => {
  function arrangeDiscussionSuccess(overrides: Record<string, unknown> = {}) {
    discussionsMod.retrieveDiscussion.mockResolvedValue({
      data: visibleDiscussion(overrides),
      error: null,
    })
    discussionsMod.createPost.mockResolvedValue({
      data: {
        object: 'projects.discussion-post',
        id: 'post_1',
        tenantId: 'ten_alpha',
        discussionId: 'dsc_1',
        authorUserId: 'usr_client',
        body: 'Reply from portal',
        editCount: 0,
        createdAt: 1787767400,
        updatedAt: 1787767400,
      },
      error: null,
    })
  }

  it('creates the discussion post with the portal user as author', async () => {
    arrangeDiscussionSuccess()

    const result = await service.createDiscussionPost(scope, 'dsc_1', {
      body: 'Reply from portal',
    })

    expect(result.error).toBeNull()
    expect(discussionsMod.retrieveDiscussion).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'dsc_1'
    )
    expect(discussionsMod.createPost).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'dsc_1',
      { body: 'Reply from portal', authorUserId: 'usr_client' }
    )
    expect(result.data?.authorUserId).toBe('usr_client')
  })

  it('returns the exact portal.discussion-post key set', async () => {
    arrangeDiscussionSuccess()

    const result = await service.createDiscussionPost(scope, 'dsc_1', {
      body: 'Reply from portal',
    })

    expect(result.error).toBeNull()
    expect(Object.keys(result.data ?? {}).sort()).toEqual(
      [
        'authorUserId',
        'body',
        'createdAt',
        'discussionId',
        'id',
        'object',
        'updatedAt',
      ].sort()
    )
    expect(result.data).toEqual({
      object: 'portal.discussion-post',
      id: 'post_1',
      discussionId: 'dsc_1',
      authorUserId: 'usr_client',
      body: 'Reply from portal',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    })
  })

  it('reads a non-visible discussion as 404 without writing', async () => {
    discussionsMod.retrieveDiscussion.mockResolvedValue({
      data: visibleDiscussion({ clientVisible: false }),
      error: null,
    })

    const result = await service.createDiscussionPost(scope, 'dsc_hidden', {
      body: 'Reply',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-not-found')
    expect(result.error?.httpStatus).toBe(404)
    expect(discussionsMod.createPost).not.toHaveBeenCalled()
  })

  it('rejects posts to a locked discussion with 409 without writing', async () => {
    discussionsMod.retrieveDiscussion.mockResolvedValue({
      data: visibleDiscussion({ locked: true }),
      error: null,
    })

    const result = await service.createDiscussionPost(scope, 'dsc_1', {
      body: 'Reply',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-locked')
    expect(result.error?.httpStatus).toBe(409)
    expect(discussionsMod.createPost).not.toHaveBeenCalled()
  })

  it('reads a discussion from another project as 404 without writing', async () => {
    discussionsMod.retrieveDiscussion.mockResolvedValue({
      data: null,
      error: notFound('projects/discussion-not-found'),
    })

    const result = await service.createDiscussionPost(scope, 'dsc_other', {
      body: 'Reply',
    })

    expect(discussionsMod.retrieveDiscussion).toHaveBeenCalledWith(
      'org_alpha',
      'prj_alpha',
      'dsc_other'
    )
    expect(result.error?.code).toBe('projects/discussion-not-found')
    expect(discussionsMod.createPost).not.toHaveBeenCalled()
  })

  it('reads a revoked grant as 404 without writing', async () => {
    const revoked = makeScope({ revokedAt: 1787767500n })

    const result = await service.createDiscussionPost(revoked, 'dsc_1', {
      body: 'Reply',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/client-grant-not-found')
    expect(discussionsMod.retrieveDiscussion).not.toHaveBeenCalled()
    expect(discussionsMod.createPost).not.toHaveBeenCalled()
  })

  it('denies discussion posts when the grant flag is off', async () => {
    const denied = makeScope({ allowDiscussions: false })

    const result = await service.createDiscussionPost(denied, 'dsc_1', {
      body: 'Reply',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(discussionsMod.retrieveDiscussion).not.toHaveBeenCalled()
    expect(discussionsMod.createPost).not.toHaveBeenCalled()
  })
})
