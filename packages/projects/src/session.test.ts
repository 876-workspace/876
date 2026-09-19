import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876ProjectsSessionClient } from './session'

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

describe('session client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('sends the user bearer and never the internal credential', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { object: 'list', data: [], has_more: false, url: '', total_count: null },
        error: null,
      })
    )
    const client = create876ProjectsSessionClient({
      baseUrl: 'https://projects.example',
      accessToken: 'mobile-token',
      fetch: fetchMock as unknown as typeof fetch,
    })

    await client.issues.list('org_1')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [unknown, RequestInit & { headers: Record<string, string> }]
    expect(init.headers.authorization).toBe('Bearer mobile-token')
    expect(init.headers).not.toHaveProperty('x-internal-key')
  })

  it('reports not-configured when no bearer is present', async () => {
    const client = create876ProjectsSessionClient({
      baseUrl: 'https://projects.example',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.issues.list('org_1')

    expect(result.error?.code).toBe('projects/not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exposes the session-opened resources', () => {
    const client = create876ProjectsSessionClient({ accessToken: 'token' })
    expect(Object.keys(client).sort()).toEqual(
      ['comments', 'issues', 'myWork', 'notifications', 'projects'].sort()
    )
  })
})
