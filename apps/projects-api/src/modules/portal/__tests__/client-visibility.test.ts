import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenantsMod,
  projectsMod,
  collaborationMod,
  automationMod,
  labelsMod,
  layoutsMod,
  workflowsMod,
  workStructureIndexMod,
  issuesRepo,
  issueLinksRepo,
  commentsRepo,
  milestonesRepo,
  cyclesRepo,
  taskListsRepo,
  milestoneDetailsRepo,
  discussionsRepo,
  attachmentsRepo,
} = vi.hoisted(() => ({
  tenantsMod: { resolveTenant: vi.fn() },
  projectsMod: { resolveProject: vi.fn() },
  collaborationMod: {
    mentionedUserIds: vi.fn(() => [] as string[]),
    ensureFollows: vi.fn(),
    notifyMentionedUsers: vi.fn(),
  },
  automationMod: { createNotificationRecord: vi.fn() },
  labelsMod: {},
  layoutsMod: {},
  workflowsMod: { checkTransition: vi.fn() },
  workStructureIndexMod: { resolveMilestoneById: vi.fn() },
  issuesRepo: { retrieve: vi.fn(), retrieveByIdentifier: vi.fn(), setIssueVisibility: vi.fn() },
  issueLinksRepo: {},
  commentsRepo: { retrieve: vi.fn(), setCommentVisibility: vi.fn() },
  milestonesRepo: { retrieveMilestone: vi.fn(), setMilestoneVisibility: vi.fn() },
  cyclesRepo: {},
  taskListsRepo: {},
  milestoneDetailsRepo: {
    retrieveMilestoneComment: vi.fn(),
    setMilestoneCommentVisibility: vi.fn(),
  },
  discussionsRepo: {
    discussionWriter: vi.fn(() => ({})),
    retrieveDiscussion: vi.fn(),
    setDiscussionVisibility: vi.fn(),
  },
  attachmentsRepo: {
    retrieveAttachmentLink: vi.fn(),
    setAttachmentVisibility: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../collaboration/index.js', () => collaborationMod)
vi.mock('../../automation/index.js', () => automationMod)
vi.mock('../../labels/index.js', () => labelsMod)
vi.mock('../../layouts/index.js', () => layoutsMod)
vi.mock('../../workflows/index.js', () => workflowsMod)
vi.mock('../../work-structure/index.js', () => workStructureIndexMod)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)
vi.mock('../../issues/issue-links.repository.js', () => issueLinksRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock('../../work-structure/work-structure.repository.js', () => milestonesRepo)
vi.mock('../../work-structure/cycles.repository.js', () => cyclesRepo)
vi.mock('../../work-structure/task-lists.repository.js', () => taskListsRepo)
vi.mock('../../work-structure/milestone-details.repository.js', () => milestoneDetailsRepo)
vi.mock('../../discussions/discussions.repository.js', () => discussionsRepo)
vi.mock('../attachment-links.repository.js', () => attachmentsRepo)

const issuesService = await import('../../issues/issues.service.js')
const commentsService = await import('../../comments/comments.service.js')
const milestonesService = await import('../../work-structure/work-structure.service.js')
const milestoneCommentsService = await import(
  '../../work-structure/milestone-details.service.js'
)
const discussionsService = await import('../../discussions/discussions.service.js')
const attachmentsService = await import('../attachment-links.service.js')

const tenant = { id: 'ten_alpha' }

const issueRow = {
  id: 'iss_1',
  tenantId: tenant.id,
  projectId: 'prj_alpha',
  deletedAt: null,
}

const commentRow = { id: 'cmt_1', issueId: 'iss_1' }

const milestoneRow = {
  id: 'mls_1',
  tenantId: tenant.id,
  projectId: 'prj_alpha',
  clientVisible: true,
}

const milestoneCommentRow = { id: 'mcm_1', milestoneId: 'mls_1' }

const discussionRow = {
  id: 'dsc_1',
  tenantId: tenant.id,
  projectId: 'prj_alpha',
  title: 'Thread',
  body: 'Body',
  pinned: false,
  locked: false,
  clientVisible: false,
  authorUserId: null,
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const attachmentRow = {
  id: 'att_1',
  tenantId: tenant.id,
  projectId: 'prj_alpha',
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
})

describe('work item visibility', () => {
  it('publishes a work item to the portal', async () => {
    issuesRepo.retrieve.mockResolvedValue(issueRow)
    issuesRepo.setIssueVisibility.mockResolvedValue({ id: 'iss_1', clientVisible: true })

    const result = await issuesService.setIssueVisibility('org_1', 'iss_1', true)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.issue',
      id: 'iss_1',
      clientVisible: true,
    })
    expect(issuesRepo.setIssueVisibility).toHaveBeenCalledWith(
      'iss_1',
      true,
      expect.anything()
    )
  })

  it('hides a work item from the portal', async () => {
    issuesRepo.retrieve.mockResolvedValue(issueRow)
    issuesRepo.setIssueVisibility.mockResolvedValue({ id: 'iss_1', clientVisible: false })

    const result = await issuesService.setIssueVisibility('org_1', 'iss_1', false)

    expect(result.error).toBeNull()
    expect(result.data?.clientVisible).toBe(false)
  })

  it('returns 404 for unknown work items without writing', async () => {
    issuesRepo.retrieve.mockResolvedValue(null)
    issuesRepo.retrieveByIdentifier.mockResolvedValue(null)

    const result = await issuesService.setIssueVisibility('org_1', 'iss_missing', true)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(issuesRepo.setIssueVisibility).not.toHaveBeenCalled()
  })
})

describe('comment visibility', () => {
  it('publishes a comment to the portal', async () => {
    issuesRepo.retrieve.mockResolvedValue(issueRow)
    commentsRepo.retrieve.mockResolvedValue(commentRow)
    commentsRepo.setCommentVisibility.mockResolvedValue({ id: 'cmt_1', clientVisible: true })

    const result = await commentsService.setCommentVisibility(
      'org_1',
      'iss_1',
      'cmt_1',
      true
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.comment',
      id: 'cmt_1',
      clientVisible: true,
    })
    expect(commentsRepo.setCommentVisibility).toHaveBeenCalledWith(
      'cmt_1',
      true,
      expect.anything()
    )
  })

  it('returns 404 for comments on unknown work items', async () => {
    issuesRepo.retrieve.mockResolvedValue(null)
    issuesRepo.retrieveByIdentifier.mockResolvedValue(null)

    const result = await commentsService.setCommentVisibility(
      'org_1',
      'iss_missing',
      'cmt_1',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(commentsRepo.setCommentVisibility).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown comments without writing', async () => {
    issuesRepo.retrieve.mockResolvedValue(issueRow)
    commentsRepo.retrieve.mockResolvedValue(null)

    const result = await commentsService.setCommentVisibility(
      'org_1',
      'iss_1',
      'cmt_missing',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/comment-not-found')
    expect(commentsRepo.setCommentVisibility).not.toHaveBeenCalled()
  })
})

describe('phase visibility', () => {
  it('publishes a phase to the portal', async () => {
    milestonesRepo.retrieveMilestone.mockResolvedValue(milestoneRow)
    milestonesRepo.setMilestoneVisibility.mockResolvedValue({
      id: 'mls_1',
      clientVisible: true,
    })

    const result = await milestonesService.setMilestoneVisibility(
      'org_1',
      'mls_1',
      true
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.milestone',
      id: 'mls_1',
      clientVisible: true,
    })
    expect(milestonesRepo.setMilestoneVisibility).toHaveBeenCalledWith(
      'mls_1',
      true,
      expect.anything()
    )
  })

  it('returns 404 for unknown phases without writing', async () => {
    milestonesRepo.retrieveMilestone.mockResolvedValue(null)

    const result = await milestonesService.setMilestoneVisibility(
      'org_1',
      'mls_missing',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/milestone-not-found')
    expect(milestonesRepo.setMilestoneVisibility).not.toHaveBeenCalled()
  })
})

describe('phase comment visibility', () => {
  it('publishes a phase comment to the portal', async () => {
    milestonesRepo.retrieveMilestone.mockResolvedValue(milestoneRow)
    milestoneDetailsRepo.retrieveMilestoneComment.mockResolvedValue(milestoneCommentRow)
    milestoneDetailsRepo.setMilestoneCommentVisibility.mockResolvedValue({
      id: 'mcm_1',
      clientVisible: true,
    })

    const result = await milestoneCommentsService.setMilestoneCommentVisibility(
      'org_1',
      'mls_1',
      'mcm_1',
      true
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.milestone-comment',
      id: 'mcm_1',
      clientVisible: true,
    })
  })

  it('returns 404 for unknown phase comments without writing', async () => {
    milestonesRepo.retrieveMilestone.mockResolvedValue(milestoneRow)
    milestoneDetailsRepo.retrieveMilestoneComment.mockResolvedValue(null)

    const result = await milestoneCommentsService.setMilestoneCommentVisibility(
      'org_1',
      'mls_1',
      'mcm_missing',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/comment-not-found')
    expect(milestoneDetailsRepo.setMilestoneCommentVisibility).not.toHaveBeenCalled()
  })
})

describe('discussion visibility service', () => {
  it('publishes a discussion to the portal', async () => {
    projectsMod.resolveProject.mockResolvedValue({ id: 'prj_alpha' })
    discussionsRepo.retrieveDiscussion.mockResolvedValue(discussionRow)
    discussionsRepo.setDiscussionVisibility.mockResolvedValue({
      ...discussionRow,
      clientVisible: true,
    })

    const result = await discussionsService.setDiscussionVisibility(
      'org_1',
      'prj_alpha',
      'dsc_1',
      true
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.discussion',
      id: 'dsc_1',
      clientVisible: true,
    })
  })

  it('returns 404 for unknown discussions without writing', async () => {
    projectsMod.resolveProject.mockResolvedValue({ id: 'prj_alpha' })
    discussionsRepo.retrieveDiscussion.mockResolvedValue(null)

    const result = await discussionsService.setDiscussionVisibility(
      'org_1',
      'prj_alpha',
      'dsc_missing',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-not-found')
    expect(discussionsRepo.setDiscussionVisibility).not.toHaveBeenCalled()
  })
})

describe('file visibility service', () => {
  it('publishes a file to the portal', async () => {
    projectsMod.resolveProject.mockResolvedValue({ id: 'prj_alpha' })
    attachmentsRepo.retrieveAttachmentLink.mockResolvedValue(attachmentRow)
    attachmentsRepo.setAttachmentVisibility.mockResolvedValue({
      ...attachmentRow,
      clientVisible: true,
    })

    const result = await attachmentsService.setAttachmentVisibility(
      'org_1',
      'prj_alpha',
      'att_1',
      true
    )

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'att_1', clientVisible: true })
    expect(attachmentsRepo.setAttachmentVisibility).toHaveBeenCalledWith(
      'att_1',
      true,
      expect.anything()
    )
  })

  it('returns 404 for unknown files without writing', async () => {
    projectsMod.resolveProject.mockResolvedValue({ id: 'prj_alpha' })
    attachmentsRepo.retrieveAttachmentLink.mockResolvedValue(null)

    const result = await attachmentsService.setAttachmentVisibility(
      'org_1',
      'prj_alpha',
      'att_missing',
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/attachment-link-not-found')
    expect(attachmentsRepo.setAttachmentVisibility).not.toHaveBeenCalled()
  })
})
