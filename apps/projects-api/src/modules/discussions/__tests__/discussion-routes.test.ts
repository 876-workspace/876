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
      discussionWriter: vi.fn(() => ({})),
      createDiscussion: vi.fn(),
      retrieveDiscussion: vi.fn(),
      listDiscussions: vi.fn(),
      updateDiscussion: vi.fn(),
      setDiscussionVisibility: vi.fn(),
      softDeleteDiscussion: vi.fn(),
      hardDeleteDiscussion: vi.fn(),
      countPosts: vi.fn(),
      createPost: vi.fn(),
      retrievePost: vi.fn(),
      listPosts: vi.fn(),
      updatePost: vi.fn(),
      recordPostEdit: vi.fn(),
      countPostEdits: vi.fn(),
      softDeletePost: vi.fn(),
      hardDeletePost: vi.fn(),
    },
  })
)

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../collaboration/index.js', () => collaborationMod)
vi.mock('../discussions.repository.js', () => repository)

const { createDiscussionsRouter } = await import('../discussions.routes.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const BASE = '/v1/organizations/org_1/projects/prj_alpha/discussions'
const CREATED_AT = 1787767200n

function discussionRow(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

function postRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dpt_1',
    tenantId: tenant.id,
    discussionId: 'dsc_1',
    authorUserId: 'usr_author',
    body: 'Original body',
    deletedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
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
    '/v1/organizations/:organizationId/projects/:projectId/discussions',
    createDiscussionsRouter()
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
  repository.listDiscussions.mockResolvedValue([])
  repository.retrieveDiscussion.mockResolvedValue(discussionRow())
  repository.countPosts.mockResolvedValue(0)
  repository.countPostEdits.mockResolvedValue(0)
})

describe('discussion collection routes', () => {
  it('rejects discussion reads without the internal key', async () => {
    const { status } = await requestJson('GET', BASE, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(repository.listDiscussions).not.toHaveBeenCalled()
  })

  it('rejects discussion creates without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      BASE,
      { title: 'T', body: 'B' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.createDiscussion).not.toHaveBeenCalled()
  })

  it('reads discussions for an unknown tenant as 404', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('reads discussions for an unknown project as 404', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
    expect(repository.listDiscussions).not.toHaveBeenCalled()
  })

  it('rejects strict discussion bodies with unknown fields', async () => {
    const { status, body } = await requestJson('POST', BASE, {
      title: 'Launch',
      body: 'Hello',
      injected: true,
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(repository.createDiscussion).not.toHaveBeenCalled()
  })

  it('rejects discussion creates missing the title with 400', async () => {
    const { status } = await requestJson('POST', BASE, { body: 'No title' })

    expect(status).toBe(400)
    expect(repository.createDiscussion).not.toHaveBeenCalled()
  })

  it('creates a discussion over HTTP with a 201 envelope', async () => {
    repository.createDiscussion.mockResolvedValue(discussionRow())

    const { status, body } = await requestJson('POST', BASE, {
      title: 'Launch thread',
      body: 'Hello world',
      authorUserId: 'usr_author',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.discussion',
      id: 'dsc_1',
    })
  })

  it('lists discussions over HTTP as a platform envelope', async () => {
    repository.listDiscussions.mockResolvedValue([discussionRow()])

    const { status, body } = await requestJson('GET', BASE)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
  })
})

describe('discussion item routes', () => {
  it('rejects discussion retrieval without the internal key', async () => {
    const { status } = await requestJson('GET', `${BASE}/dsc_1`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(repository.retrieveDiscussion).not.toHaveBeenCalled()
  })

  it('rejects discussion updates without the internal key', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1`,
      { title: 'New' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.updateDiscussion).not.toHaveBeenCalled()
  })

  it('rejects discussion deletes without the internal key', async () => {
    const { status } = await requestJson('DELETE', `${BASE}/dsc_1`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
  })

  it('reads an unknown discussion as 404', async () => {
    repository.retrieveDiscussion.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', `${BASE}/dsc_missing`)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/discussion-not-found')
  })

  it('rejects empty discussion updates with 400', async () => {
    const { status } = await requestJson('PATCH', `${BASE}/dsc_1`, {})

    expect(status).toBe(400)
    expect(repository.updateDiscussion).not.toHaveBeenCalled()
  })

  it('updates a discussion over HTTP', async () => {
    repository.updateDiscussion.mockResolvedValue(
      discussionRow({ title: 'Renamed' })
    )

    const { status, body } = await requestJson('PATCH', `${BASE}/dsc_1`, {
      title: 'Renamed',
    })

    expect(status).toBe(200)
    expect(body.data.title).toBe('Renamed')
  })

  it('deletes a discussion over HTTP', async () => {
    const { status, body } = await requestJson('DELETE', `${BASE}/dsc_1`)

    expect(status).toBe(200)
    expect(body.data).toMatchObject({ id: 'dsc_1', deleted: true })
  })
})

describe('discussion visibility routes', () => {
  it('rejects visibility changes without the internal key', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/client-visibility`,
      { clientVisible: true },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(body.error.code).toBe('projects/unauthorized')
    expect(repository.setDiscussionVisibility).not.toHaveBeenCalled()
  })

  it('rejects visibility bodies with a non-boolean flag', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/client-visibility`,
      { clientVisible: 'yes' }
    )

    expect(status).toBe(400)
    expect(repository.setDiscussionVisibility).not.toHaveBeenCalled()
  })

  it('rejects visibility changes for unknown discussions as 404', async () => {
    repository.retrieveDiscussion.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'PATCH',
      `${BASE}/dsc_missing/client-visibility`,
      { clientVisible: true }
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/discussion-not-found')
  })

  it('publishes a discussion to the portal over HTTP', async () => {
    repository.setDiscussionVisibility.mockResolvedValue(
      discussionRow({ clientVisible: true })
    )

    const { status, body } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/client-visibility`,
      { clientVisible: true }
    )

    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'projects.discussion',
      id: 'dsc_1',
      clientVisible: true,
    })
    expect(repository.setDiscussionVisibility).toHaveBeenCalledWith(
      'dsc_1',
      true,
      expect.anything()
    )
  })

  it('hides a discussion from the portal over HTTP', async () => {
    repository.setDiscussionVisibility.mockResolvedValue(
      discussionRow({ clientVisible: false })
    )

    const { status, body } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/client-visibility`,
      { clientVisible: false }
    )

    expect(status).toBe(200)
    expect(body.data.clientVisible).toBe(false)
  })
})

describe('discussion post routes', () => {
  it('rejects post reads without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${BASE}/dsc_1/posts`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.listPosts).not.toHaveBeenCalled()
  })

  it('rejects post creates without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${BASE}/dsc_1/posts`,
      { body: 'Hi', authorUserId: 'usr_author' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.createPost).not.toHaveBeenCalled()
  })

  it('rejects post edits without the internal key', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/posts/dpt_1`,
      { body: 'Edited', authorUserId: 'usr_author' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.updatePost).not.toHaveBeenCalled()
  })

  it('rejects post deletes without the internal key', async () => {
    const { status } = await requestJson(
      'DELETE',
      `${BASE}/dsc_1/posts/dpt_1`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
  })

  it('rejects strict post bodies with unknown fields', async () => {
    const { status } = await requestJson('POST', `${BASE}/dsc_1/posts`, {
      body: 'Hi',
      authorUserId: 'usr_author',
      injected: true,
    })

    expect(status).toBe(400)
    expect(repository.createPost).not.toHaveBeenCalled()
  })

  it('rejects locked discussions with 409 on post create', async () => {
    repository.retrieveDiscussion.mockResolvedValue(
      discussionRow({ locked: true })
    )

    const { status, body } = await requestJson('POST', `${BASE}/dsc_1/posts`, {
      body: 'Hi',
      authorUserId: 'usr_author',
    })

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/discussion-locked')
    expect(repository.createPost).not.toHaveBeenCalled()
  })

  it('creates a post over HTTP with a 201 envelope', async () => {
    repository.createPost.mockResolvedValue(postRow())

    const { status, body } = await requestJson('POST', `${BASE}/dsc_1/posts`, {
      body: 'Original body',
      authorUserId: 'usr_author',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.discussion-post',
      id: 'dpt_1',
    })
  })

  it('lists posts over HTTP as a platform envelope', async () => {
    repository.listPosts.mockResolvedValue([postRow()])

    const { status, body } = await requestJson('GET', `${BASE}/dsc_1/posts`)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
  })

  it('rejects post edits missing the author scope with 400', async () => {
    const { status } = await requestJson('PATCH', `${BASE}/dsc_1/posts/dpt_1`, {
      body: 'Edited',
    })

    expect(status).toBe(400)
    expect(repository.updatePost).not.toHaveBeenCalled()
  })

  it('reads edits of unknown posts as 404', async () => {
    repository.retrievePost.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'PATCH',
      `${BASE}/dsc_1/posts/dpt_missing`,
      { body: 'Edited', authorUserId: 'usr_author' }
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/discussion-post-not-found')
  })

  it('deletes a post over HTTP', async () => {
    repository.retrievePost.mockResolvedValue(postRow())

    const { status, body } = await requestJson(
      'DELETE',
      `${BASE}/dsc_1/posts/dpt_1`
    )

    expect(status).toBe(200)
    expect(body.data).toMatchObject({ id: 'dpt_1', deleted: true })
  })
})
