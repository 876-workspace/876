import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsMod, projectsMod, collaborationMocks, repository } = vi.hoisted(
  () => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    collaborationMocks: {
      ensureFollows: vi.fn(),
      notifyMentionedUsers: vi.fn(),
    },
    repository: {
      discussionWriter: vi.fn(),
      createDiscussion: vi.fn(),
      retrieveDiscussion: vi.fn(),
      countPosts: vi.fn(),
      updateDiscussion: vi.fn(),
      createPost: vi.fn(),
      retrievePost: vi.fn(),
      updatePost: vi.fn(),
      recordPostEdit: vi.fn(),
      countPostEdits: vi.fn(),
    },
  })
)

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../collaboration/index.js', async () => {
  const mentions = await import('../../collaboration/mentions.js')
  return {
    mentionedUserIds: (body: string, authorUserId?: string | null) =>
      mentions.parseMentionedUserIds(body, {
        selfUserId: authorUserId ?? null,
      }),
    ensureFollows: collaborationMocks.ensureFollows,
    notifyMentionedUsers: collaborationMocks.notifyMentionedUsers,
  }
})
vi.mock('../discussions.repository.js', () => repository)

const service = await import('../discussions.service.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const CREATED_AT = 1787767200n

const discussionRow = {
  id: 'dsc_1',
  tenantId: tenant.id,
  projectId: project.id,
  title: 'Launch thread',
  body: 'Hello world',
  pinned: false,
  locked: false,
  clientVisible: false,
  authorUserId: 'usr_author',
  deletedAt: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

function postRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dpt_1',
    tenantId: tenant.id,
    discussionId: discussionRow.id,
    authorUserId: 'usr_author',
    body: 'Original body',
    deletedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  repository.discussionWriter.mockReturnValue({})
  repository.countPosts.mockResolvedValue(0)
  repository.countPostEdits.mockResolvedValue(0)
})

describe('discussions service', () => {
  it('creates a discussion and auto-follows the author plus mentioned users', async () => {
    repository.createDiscussion.mockResolvedValue(discussionRow)

    const result = await service.createDiscussion('org_1', project.id, {
      title: 'Launch thread',
      body: 'Hello @[Ada](user:usr_ada)',
      authorUserId: 'usr_author',
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.discussion',
      postCount: 0,
    })
    expect(collaborationMocks.ensureFollows).toHaveBeenCalledWith(
      {},
      tenant.id,
      expect.arrayContaining([
        expect.objectContaining({ userId: 'usr_author' }),
        expect.objectContaining({ userId: 'usr_ada' }),
      ])
    )
    expect(collaborationMocks.notifyMentionedUsers).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ['usr_ada'] })
    )
  })

  it('edits a post in place inside the 15 minute window', async () => {
    repository.retrieveDiscussion.mockResolvedValue(discussionRow)
    repository.retrievePost.mockResolvedValue(postRow())
    repository.updatePost.mockResolvedValue(
      postRow({ body: 'Edited body' })
    )

    const result = await service.updatePost(
      'org_1',
      project.id,
      discussionRow.id,
      'dpt_1',
      { body: 'Edited body', authorUserId: 'usr_author' },
      Number(CREATED_AT) + 60
    )

    expect(result.error).toBeNull()
    expect(result.data?.body).toBe('Edited body')
    expect(repository.recordPostEdit).not.toHaveBeenCalled()
  })

  it('appends edit history when editing after the window closes', async () => {
    repository.retrieveDiscussion.mockResolvedValue(discussionRow)
    repository.retrievePost.mockResolvedValue(postRow())
    repository.updatePost.mockResolvedValue(postRow({ body: 'Late edit' }))
    repository.countPostEdits.mockResolvedValue(1)

    const result = await service.updatePost(
      'org_1',
      project.id,
      discussionRow.id,
      'dpt_1',
      { body: 'Late edit', authorUserId: 'usr_author' },
      Number(CREATED_AT) + 901
    )

    expect(result.error).toBeNull()
    expect(result.data?.editCount).toBe(1)
    expect(repository.recordPostEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: 'dpt_1',
        body: 'Original body',
        editedBy: 'usr_author',
      })
    )
  })

  it('skips history rows when the late edit leaves the body unchanged', async () => {
    repository.retrieveDiscussion.mockResolvedValue(discussionRow)
    repository.retrievePost.mockResolvedValue(postRow())
    repository.updatePost.mockResolvedValue(postRow())

    await service.updatePost(
      'org_1',
      project.id,
      discussionRow.id,
      'dpt_1',
      { body: 'Original body', authorUserId: 'usr_author' },
      Number(CREATED_AT) + 5000
    )

    expect(repository.recordPostEdit).not.toHaveBeenCalled()
  })

  it('rejects edits from non-authors', async () => {
    repository.retrieveDiscussion.mockResolvedValue(discussionRow)
    repository.retrievePost.mockResolvedValue(postRow())

    const result = await service.updatePost(
      'org_1',
      project.id,
      discussionRow.id,
      'dpt_1',
      { body: 'Hijack', authorUserId: 'usr_intruder' },
      Number(CREATED_AT) + 60
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-post-forbidden')
    expect(repository.updatePost).not.toHaveBeenCalled()
  })

  it('rejects new posts on locked discussions', async () => {
    repository.retrieveDiscussion.mockResolvedValue({
      ...discussionRow,
      locked: true,
    })

    const result = await service.createPost('org_1', project.id, 'dsc_1', {
      body: 'Too late',
      authorUserId: 'usr_author',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-locked')
    expect(repository.createPost).not.toHaveBeenCalled()
  })

  it('holds the edit window open for exactly 15 minutes', () => {
    const created = Number(CREATED_AT)
    expect(service.postEditWindowOpen(CREATED_AT, created + 900)).toBe(true)
    expect(service.postEditWindowOpen(CREATED_AT, created + 901)).toBe(false)
  })
})
