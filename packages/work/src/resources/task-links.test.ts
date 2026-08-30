import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTaskLinksResource } from './task-links'
import type { WorkRuntime } from '../runtime'

describe('createTaskLinksResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const taskLinks = createTaskLinksResource(runtime)

  function createLinkFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'task_link',
      id: 'link_kin_01',
      taskId: 'task_kin_01',
      service: 'crm',
      resource: 'request',
      externalId: 'req_kin_01',
      label: 'Kingston Depot Delivery Support',
      url: 'https://crm.876.com/requests/req_kin_01',
      isPrimary: true,
      createdAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists task links with organization and task path', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createLinkFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/tasks/task_kin_01/links',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLinks.list('org_kingston_central', 'task_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/links',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('creates task link with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createLinkFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      service: 'crm',
      resource: 'request',
      externalId: 'req_kin_01',
      label: 'Kingston Depot Delivery Support',
      isPrimary: true,
    }
    const result = await taskLinks.create(
      'org_kingston_central',
      'task_kin_01',
      input
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/links',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.service).toBe('crm')
    expect(result.data?.isPrimary).toBe(true)
  })

  it('deletes task link via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'task_link', id: 'link_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLinks.delete(
      'org_kingston_central',
      'task_kin_01',
      'link_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/links/link_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'task_link', id: 'link_kin_01', deleted: true },
      error: null,
    })
  })

  it('encodes special characters in path parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await taskLinks.list('org/special', 'task/special')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2Fspecial/tasks/task%2Fspecial/links',
      expect.any(Object)
    )
  })

  it('propagates invalid-response error when response does not match schema', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { bad: 'data' },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLinks.list('org_kingston_central', 'task_kin_01')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/invalid-response',
        message: 'Work API returned an invalid response.',
      },
    })
  })

  it('propagates API error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/task-not-found', message: 'Task not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLinks.list('org_kingston_central', 'task_missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'work/task-not-found', message: 'Task not found.' },
    })
  })
})
