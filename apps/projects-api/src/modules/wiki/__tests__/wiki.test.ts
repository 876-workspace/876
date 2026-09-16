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
      wikiWriter: vi.fn(),
      retrievePageBySlug: vi.fn(),
      retrievePageById: vi.fn(),
      createPage: vi.fn(),
      createRevision: vi.fn(),
      latestRevision: vi.fn(),
      countRevisions: vi.fn(),
      updatePage: vi.fn(),
      listAllPageLinks: vi.fn(),
      listRevisions: vi.fn(),
      retrieveRevision: vi.fn(),
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
vi.mock('../wiki.repository.js', () => repository)

const service = await import('../wiki.service.js')
const slugUtils = await import('../wiki.slug.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const CREATED_AT = 1787767200n

function pageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wpg_1',
    tenantId: tenant.id,
    projectId: project.id,
    slug: 'launch-plan',
    title: 'Launch Plan',
    parentPageId: null,
    deletedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  }
}

const revisionRow = {
  id: 'wrv_1',
  tenantId: tenant.id,
  pageId: 'wpg_1',
  title: 'Launch Plan',
  body: 'Version one',
  authorUserId: 'usr_author',
  createdAt: CREATED_AT,
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  repository.wikiWriter.mockReturnValue({})
  repository.latestRevision.mockResolvedValue(revisionRow)
  repository.countRevisions.mockResolvedValue(1)
})

describe('wiki service', () => {
  it('derives the slug from the title and saves the first revision', async () => {
    repository.retrievePageBySlug.mockResolvedValue(null)
    repository.createPage.mockResolvedValue(pageRow())
    repository.createRevision.mockResolvedValue(revisionRow)

    const result = await service.createPage('org_1', project.id, {
      title: 'Launch Plan',
      body: 'Version one',
      authorUserId: 'usr_author',
    })

    expect(result.error).toBeNull()
    expect(result.data?.slug).toBe('launch-plan')
    expect(repository.createPage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'launch-plan' })
    )
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Launch Plan', body: 'Version one' })
    )
  })

  it('rejects slug collisions within the project', async () => {
    repository.retrievePageBySlug.mockResolvedValue(pageRow())

    const result = await service.createPage('org_1', project.id, {
      title: 'Different Title',
      slug: 'launch-plan',
      body: 'Body',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-page-slug-taken')
    expect(repository.createPage).not.toHaveBeenCalled()
  })

  it('rejects re-parenting that would create a cycle', async () => {
    repository.retrievePageById.mockImplementation(
      async (_tenantId: string, _projectId: string, id: string) =>
        id === 'wpg_parent' ? pageRow({ id: 'wpg_parent' }) : null
    )
    repository.listAllPageLinks.mockResolvedValue([
      { id: 'wpg_1', parentPageId: null },
      { id: 'wpg_parent', parentPageId: 'wpg_1' },
    ])

    const result = await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: 'wpg_parent',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-invalid-parent')
    expect(repository.updatePage).not.toHaveBeenCalled()
  })

  it('appends a revision on content change but not on moves alone', async () => {
    repository.retrievePageById.mockResolvedValue(pageRow())
    repository.updatePage.mockImplementation(async (id: string, patch: unknown) => ({
      ...pageRow(),
      ...(patch as Record<string, unknown>),
    }))

    await service.updatePage('org_1', project.id, 'wpg_1', {
      body: 'Version two',
      authorUserId: 'usr_author',
    })
    expect(repository.createRevision).toHaveBeenCalledTimes(1)
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Version two' })
    )

    repository.createRevision.mockClear()
    await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: null,
    })
    expect(repository.createRevision).not.toHaveBeenCalled()
  })

  it('keeps revisions append-only across successive saves', async () => {
    repository.retrievePageBySlug.mockResolvedValue(null)
    repository.createPage.mockResolvedValue(pageRow())
    repository.retrievePageById.mockResolvedValue(pageRow())
    repository.updatePage.mockImplementation(async () => pageRow())

    await service.createPage('org_1', project.id, {
      title: 'Launch Plan',
      body: 'Version one',
    })
    await service.updatePage('org_1', project.id, 'wpg_1', {
      body: 'Version two',
    })
    await service.updatePage('org_1', project.id, 'wpg_1', {
      body: 'Version three',
    })

    expect(repository.createRevision).toHaveBeenCalledTimes(3)
  })

  it('restores by appending a new revision that copies the old one', async () => {
    const oldRevision = { ...revisionRow, id: 'wrv_old', body: 'Original text' }
    repository.retrievePageById.mockResolvedValue(pageRow())
    repository.retrieveRevision.mockResolvedValue(oldRevision)
    repository.updatePage.mockImplementation(async () => pageRow())

    const result = await service.restoreRevision(
      'org_1',
      project.id,
      'wpg_1',
      'wrv_old',
      'usr_author'
    )

    expect(result.error).toBeNull()
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        title: oldRevision.title,
        body: 'Original text',
        authorUserId: 'usr_author',
      })
    )
  })

  it('returns 404 when restoring from a missing revision', async () => {
    repository.retrievePageById.mockResolvedValue(pageRow())
    repository.retrieveRevision.mockResolvedValue(null)

    const result = await service.restoreRevision(
      'org_1',
      project.id,
      'wpg_1',
      'wrv_missing'
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-revision-not-found')
    expect(repository.createRevision).not.toHaveBeenCalled()
  })

  it('detects parent cycles purely from page links', () => {
    expect(
      slugUtils.wouldCreateCycle(
        [
          { id: 'a', parentPageId: null },
          { id: 'b', parentPageId: 'a' },
        ],
        'a',
        'b'
      )
    ).toBe(true)
    expect(
      slugUtils.wouldCreateCycle(
        [
          { id: 'a', parentPageId: null },
          { id: 'b', parentPageId: 'a' },
        ],
        'b',
        'a'
      )
    ).toBe(false)
    expect(slugUtils.wouldCreateCycle([], 'a', 'a')).toBe(true)
  })
})
