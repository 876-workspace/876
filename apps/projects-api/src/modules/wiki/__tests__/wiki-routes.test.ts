import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

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

const { createWikiRouter } = await import('../wiki.routes.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const BASE = '/v1/organizations/org_1/projects/prj_alpha/wiki'
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

function revisionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wrv_1',
    tenantId: tenant.id,
    pageId: 'wpg_1',
    title: 'Launch Plan',
    body: 'Version one',
    authorUserId: 'usr_author',
    createdAt: CREATED_AT,
    ...overrides,
  }
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use(
    '/v1/organizations/:organizationId/projects/:projectId/wiki',
    createWikiRouter()
  )
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  repository.listPages.mockResolvedValue([])
  repository.retrievePageById.mockResolvedValue(pageRow())
  repository.retrievePageBySlug.mockResolvedValue(null)
  repository.latestRevision.mockResolvedValue(revisionRow())
  repository.countRevisions.mockResolvedValue(1)
})

describe('wiki collection routes', () => {
  it('rejects page reads without the internal key', async () => {
    const { status } = await requestJson('GET', BASE, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(repository.listPages).not.toHaveBeenCalled()
  })

  it('rejects page creates without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      BASE,
      { title: 'T', body: 'B' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.createPage).not.toHaveBeenCalled()
  })

  it('reads pages for an unknown tenant as 404', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('reads pages for an unknown project as 404', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
    expect(repository.listPages).not.toHaveBeenCalled()
  })

  it('rejects strict page bodies with unknown fields', async () => {
    const { status, body } = await requestJson('POST', BASE, {
      title: 'Launch',
      body: 'Content',
      injected: true,
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(repository.createPage).not.toHaveBeenCalled()
  })

  it('rejects page creates with a malformed slug', async () => {
    const { status } = await requestJson('POST', BASE, {
      title: 'Launch',
      body: 'Content',
      slug: 'Not A Slug!',
    })

    expect(status).toBe(400)
    expect(repository.createPage).not.toHaveBeenCalled()
  })

  it('creates a page over HTTP with a 201 envelope', async () => {
    repository.createPage.mockResolvedValue(pageRow())
    repository.createRevision.mockResolvedValue(revisionRow())

    const { status, body } = await requestJson('POST', BASE, {
      title: 'Launch Plan',
      body: 'Version one',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.wiki-page',
      slug: 'launch-plan',
    })
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Launch Plan', body: 'Version one' })
    )
  })

  it('lists pages over HTTP as a platform envelope', async () => {
    repository.listPages.mockResolvedValue([pageRow()])

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
  })
})

describe('wiki item routes', () => {
  it('rejects page retrieval without the internal key', async () => {
    const { status } = await requestJson('GET', `${BASE}/launch-plan`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(repository.retrievePageById).not.toHaveBeenCalled()
  })

  it('rejects page updates without the internal key', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${BASE}/wpg_1`,
      { title: 'New' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.updatePage).not.toHaveBeenCalled()
  })

  it('rejects page deletes without the internal key', async () => {
    const { status } = await requestJson('DELETE', `${BASE}/wpg_1`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
  })

  it('reads an unknown page as 404', async () => {
    repository.retrievePageById.mockResolvedValue(null)
    repository.retrievePageBySlug.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', `${BASE}/no-such-page`)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/wiki-page-not-found')
  })

  it('rejects empty page updates with 400', async () => {
    const { status } = await requestJson('PATCH', `${BASE}/wpg_1`, {})

    expect(status).toBe(400)
    expect(repository.updatePage).not.toHaveBeenCalled()
  })

  it('resolves pages by slug over HTTP', async () => {
    repository.retrievePageById.mockResolvedValue(null)
    repository.retrievePageBySlug.mockResolvedValue(pageRow())

    const { status, body } = await requestJson('GET', `${BASE}/launch-plan`)

    expect(status).toBe(200)
    expect(body.data.slug).toBe('launch-plan')
    expect(repository.retrievePageBySlug).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      'launch-plan'
    )
  })

  it('updates a page title over HTTP', async () => {
    repository.updatePage.mockImplementation(async (id: string, patch: unknown) => ({
      ...pageRow(),
      id,
      ...(patch as Record<string, unknown>),
    }))

    const { status, body } = await requestJson('PATCH', `${BASE}/wpg_1`, {
      title: 'Renamed Plan',
    })

    expect(status).toBe(200)
    expect(body.data.title).toBe('Renamed Plan')
    expect(repository.createRevision).toHaveBeenCalledTimes(1)
  })

  it('deletes a page over HTTP', async () => {
    const { status, body } = await requestJson('DELETE', `${BASE}/wpg_1`)

    expect(status).toBe(200)
    expect(body.data).toMatchObject({ id: 'wpg_1', deleted: true })
  })
})

describe('wiki revision routes', () => {
  it('rejects revision reads without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${BASE}/wpg_1/revisions`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.listRevisions).not.toHaveBeenCalled()
  })

  it('rejects single revision reads without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${BASE}/wpg_1/revisions/wrv_1`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.retrieveRevision).not.toHaveBeenCalled()
  })

  it('rejects restores without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${BASE}/wpg_1/restore`,
      { revisionId: 'wrv_1' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.createRevision).not.toHaveBeenCalled()
  })

  it('lists revisions over HTTP', async () => {
    repository.listRevisions.mockResolvedValue([revisionRow()])

    const { status, body } = await requestJson('GET', `${BASE}/wpg_1/revisions`)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.wiki-revision',
      id: 'wrv_1',
    })
  })

  it('reads a single revision over HTTP', async () => {
    repository.retrieveRevision.mockResolvedValue(revisionRow())

    const { status, body } = await requestJson(
      'GET',
      `${BASE}/wpg_1/revisions/wrv_1`
    )

    expect(status).toBe(200)
    expect(body.data.id).toBe('wrv_1')
  })

  it('reads a missing revision as 404', async () => {
    repository.retrieveRevision.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'GET',
      `${BASE}/wpg_1/revisions/wrv_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/wiki-revision-not-found')
  })

  it('rejects restore bodies missing the revision id with 400', async () => {
    const { status } = await requestJson('POST', `${BASE}/wpg_1/restore`, {})

    expect(status).toBe(400)
    expect(repository.createRevision).not.toHaveBeenCalled()
  })

  it('restores a revision by appending over HTTP', async () => {
    repository.retrieveRevision.mockResolvedValue(revisionRow())
    repository.updatePage.mockImplementation(async () => pageRow())

    const { status, body } = await requestJson('POST', `${BASE}/wpg_1/restore`, {
      revisionId: 'wrv_1',
    })

    expect(status).toBe(200)
    expect(body.data.object).toBe('projects.wiki-page')
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: 'wpg_1', body: 'Version one' })
    )
  })

  it('restores against a missing revision as 404', async () => {
    repository.retrieveRevision.mockResolvedValue(null)

    const { status, body } = await requestJson('POST', `${BASE}/wpg_1/restore`, {
      revisionId: 'wrv_missing',
    })

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/wiki-revision-not-found')
    expect(repository.createRevision).not.toHaveBeenCalled()
  })
})
