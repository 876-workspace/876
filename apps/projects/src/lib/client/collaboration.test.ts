import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clientGrantsClient,
  discussionsClient,
  followsClient,
  visibilityClient,
  wikiClient,
} from './collaboration'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof globalThis.fetch>()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(jsonResponse({ data: null, error: null }))
})

function lastCall(): { url: unknown; init: RequestInit | undefined } {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('expected fetch to be called')
  return { url: call[0], init: call[1] }
}

describe('followsClient', () => {
  it('posts the desired follow state for a project', async () => {
    await followsClient.setFollowed('project', 'prj_1', true)

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/follow')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ following: true })
  })

  it('routes phase follows through the phases follow route', async () => {
    await followsClient.setFollowed('phase', 'ms_1', true)

    expect(lastCall().url).toBe('/api/phases/ms_1/follow')
  })

  it('routes work-item unfollows through the issues follow route', async () => {
    await followsClient.setFollowed('work-item', 'PRJ-12', false)

    const { url, init } = lastCall()
    expect(url).toBe('/api/issues/PRJ-12/follow')
    expect(JSON.parse(init?.body as string)).toEqual({ following: false })
  })
})

describe('discussionsClient', () => {
  it('creates a discussion with title and opening post', async () => {
    await discussionsClient.create('prj_1', {
      title: 'Launch plan',
      body: 'Opening post',
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/discussions')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      title: 'Launch plan',
      body: 'Opening post',
    })
  })

  it('posts replies to the discussion posts route', async () => {
    await discussionsClient.reply('prj_1', 'dis_1', { body: 'Agreed' })

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/discussions/dis_1/posts')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ body: 'Agreed' })
  })
})

describe('wikiClient', () => {
  it('restores a revision through the restore route', async () => {
    await wikiClient.restore('prj_1', 'home', { revisionId: 'rev_3' })

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/wiki/home/restore')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ revisionId: 'rev_3' })
  })
})

describe('clientGrantsClient', () => {
  it('invites an existing member by user id', async () => {
    await clientGrantsClient.invite('prj_1', {
      userId: 'usr_client',
      allowDiscussions: true,
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/client-grants')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      userId: 'usr_client',
      allowDiscussions: true,
    })
  })

  it('revokes a grant through the revoke route', async () => {
    await clientGrantsClient.revoke('prj_1', 'grant_1')

    const { url, init } = lastCall()
    expect(url).toBe('/api/projects/prj_1/client-grants/grant_1/revoke')
    expect(init?.method).toBe('POST')
  })
})

describe('visibilityClient', () => {
  it('patches the work-item visibility route with the confirmed flag', async () => {
    await visibilityClient.setIssueVisibility('PRJ-12', true)

    const { url, init } = lastCall()
    expect(url).toBe('/api/issues/PRJ-12/visibility')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(init?.body as string)).toEqual({ clientVisible: true })
  })
})
