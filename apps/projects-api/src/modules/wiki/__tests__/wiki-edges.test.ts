import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isValidSlug, slugifyTitle, wouldCreateCycle } from '../wiki.slug.js'

const { tenantsMod, projectsMod, collaborationMod, repository } = vi.hoisted(
  () => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    collaborationMod: {
      mentionedUserIds: vi.fn(() => [] as string[]),
      ensureFollows: vi.fn(),
      notifyMentionedUsers: vi.fn(),
    },
    repository: {
      wikiWriter: vi.fn(() => ({})),
      listPages: vi.fn(),
      listAllPageLinks: vi.fn(),
      retrievePageById: vi.fn(),
      retrievePageBySlug: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
      softDeletePage: vi.fn(),
      hardDeletePage: vi.fn(),
      createRevision: vi.fn(),
      latestRevision: vi.fn(),
      countRevisions: vi.fn(),
      listRevisions: vi.fn(),
      retrieveRevision: vi.fn(),
    },
  })
)

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../collaboration/index.js', () => collaborationMod)
vi.mock('../wiki.repository.js', () => repository)

const service = await import('../wiki.service.js')

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

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
})

describe('slug normalisation edges', () => {
  it('lowercases and hyphenates titles', () => {
    expect(slugifyTitle('Launch Plan 2026')).toBe('launch-plan-2026')
  })

  it('collapses runs of separators into one hyphen', () => {
    expect(slugifyTitle('Hello --- World')).toBe('hello-world')
    expect(slugifyTitle('a   b')).toBe('a-b')
  })

  it('strips leading and trailing punctuation', () => {
    expect(slugifyTitle('  ***Kickoff!!!  ')).toBe('kickoff')
  })

  it('falls back to page for empty and symbol-only titles', () => {
    expect(slugifyTitle('')).toBe('page')
    expect(slugifyTitle('   ')).toBe('page')
    expect(slugifyTitle('©™®')).toBe('page')
  })

  it('preserves digits and existing kebab slugs', () => {
    expect(slugifyTitle('phase-2-retro')).toBe('phase-2-retro')
    expect(slugifyTitle('Q3 2026 Review')).toBe('q3-2026-review')
  })

  it('validates slugs strictly', () => {
    expect(isValidSlug('launch-plan')).toBe(true)
    expect(isValidSlug('a1-b2')).toBe(true)
    expect(isValidSlug('Launch')).toBe(false)
    expect(isValidSlug('-launch')).toBe(false)
    expect(isValidSlug('launch-')).toBe(false)
    expect(isValidSlug('launch--plan')).toBe(false)
    expect(isValidSlug('launch_plan')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('wiki reparent cycles', () => {
  it('rejects reparenting under a grandchild descendant', async () => {
    repository.retrievePageById.mockImplementation(
      async (_tenantId: string, _projectId: string, id: string) =>
        id === 'wpg_1' || id === 'wpg_grandchild' ? pageRow({ id }) : null
    )
    repository.listAllPageLinks.mockResolvedValue([
      { id: 'wpg_1', parentPageId: null },
      { id: 'wpg_child', parentPageId: 'wpg_1' },
      { id: 'wpg_grandchild', parentPageId: 'wpg_child' },
    ])

    const result = await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: 'wpg_grandchild',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-invalid-parent')
    expect(repository.updatePage).not.toHaveBeenCalled()
  })

  it('rejects self-parenting', async () => {
    repository.retrievePageById.mockResolvedValue(pageRow())
    repository.listAllPageLinks.mockResolvedValue([
      { id: 'wpg_1', parentPageId: null },
    ])

    const result = await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: 'wpg_1',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-invalid-parent')
    expect(repository.updatePage).not.toHaveBeenCalled()
  })

  it('allows reparenting to an unrelated page', async () => {
    repository.retrievePageById.mockImplementation(
      async (_tenantId: string, _projectId: string, id: string) =>
        pageRow({ id })
    )
    repository.listAllPageLinks.mockResolvedValue([
      { id: 'wpg_1', parentPageId: null },
      { id: 'wpg_other', parentPageId: null },
    ])
    repository.updatePage.mockImplementation(async (id: string, patch: unknown) => ({
      ...pageRow(),
      id,
      ...(patch as Record<string, unknown>),
    }))
    repository.latestRevision.mockResolvedValue(null)
    repository.countRevisions.mockResolvedValue(1)

    const result = await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: 'wpg_other',
    })

    expect(result.error).toBeNull()
    expect(repository.updatePage).toHaveBeenCalledWith(
      'wpg_1',
      expect.objectContaining({ parentPageId: 'wpg_other' })
    )
  })

  it('rejects moves under a missing parent as not-found', async () => {
    repository.retrievePageById.mockImplementation(
      async (_tenantId: string, _projectId: string, id: string) =>
        id === 'wpg_1' ? pageRow() : null
    )

    const result = await service.updatePage('org_1', project.id, 'wpg_1', {
      parentPageId: 'wpg_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-page-not-found')
  })

  it('detects cycles through multi-hop ancestor chains', () => {
    const pages = [
      { id: 'a', parentPageId: null },
      { id: 'b', parentPageId: 'a' },
      { id: 'c', parentPageId: 'b' },
      { id: 'd', parentPageId: 'c' },
    ]
    expect(wouldCreateCycle(pages, 'a', 'd')).toBe(true)
    expect(wouldCreateCycle(pages, 'b', 'd')).toBe(true)
    expect(wouldCreateCycle(pages, 'd', 'a')).toBe(false)
    expect(wouldCreateCycle(pages, 'd', null)).toBe(false)
  })
})

describe('wiki restore edges', () => {
  it('returns 404 when restoring a page that no longer exists', async () => {
    repository.retrievePageById.mockResolvedValue(null)
    repository.retrievePageBySlug.mockResolvedValue(null)

    const result = await service.restoreRevision(
      'org_1',
      project.id,
      'wpg_missing',
      'wrv_1'
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/wiki-page-not-found')
    expect(repository.createRevision).not.toHaveBeenCalled()
  })

  it('returns 404 when restoring from a missing revision id', async () => {
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
    expect(repository.updatePage).not.toHaveBeenCalled()
  })
})
