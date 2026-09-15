import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  issueDependencySchema,
  issueDependencyViewSchema,
  scheduleSuggestionSchema,
} from '../types'
import { createIssueDependenciesResource } from './issue-dependencies'

describe('issue-dependencies resource', () => {
  const resource = createIssueDependenciesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists predecessors and successors for an issue', async () => {
    await resource.list('org 1', 'CONSOLE-12')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/issues/CONSOLE-12/dependencies',
        signal: undefined,
      },
      issueDependencyViewSchema
    )
  })

  it('creates a dependency with type and lag', async () => {
    const input = {
      predecessorIssueId: 'iss_1',
      successorIssueId: 'iss_2',
      type: 'finish-to-start' as const,
      lagMinutes: 60,
    }
    await resource.create('org 1', 'iss_2', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/issues/iss_2/dependencies',
        body: input,
      }),
      issueDependencySchema
    )
  })

  it('creates a dependency with server-side type and lag defaults', async () => {
    const input = { predecessorIssueId: 'iss_1', successorIssueId: 'iss_2' }
    await resource.create('org 1', 'iss_2', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'POST', body: input }),
      issueDependencySchema
    )
  })

  it('updates a dependency type and lag', async () => {
    const input = { type: 'start-to-start' as const, lagMinutes: -30 }
    await resource.update('org 1', 'iss_2', 'isd_1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/issues/iss_2/dependencies/isd_1',
        body: input,
      }),
      issueDependencySchema
    )
  })

  it('deletes a dependency by id', async () => {
    await resource.delete('org 1', 'iss_2', 'isd_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org%201/issues/iss_2/dependencies/isd_1',
      }),
      deletedSchema
    )
  })

  it('requests a schedule suggestion without writing anything', async () => {
    await resource.suggestSchedule('org 1', 'iss_2')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/issues/iss_2/dependencies/schedule-suggestion',
        body: {},
        signal: undefined,
      },
      scheduleSuggestionSchema
    )
  })

  it('forwards an abort signal on suggestSchedule', async () => {
    const controller = new AbortController()
    await resource.suggestSchedule('org 1', 'iss_2', {
      signal: controller.signal,
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
      scheduleSuggestionSchema
    )
  })

  it('is reachable from the shared client', async () => {
    const { create876ProjectsClient } = await import('../client')
    const client = create876ProjectsClient({ internalKey: 'key' })

    await client.issueDependencies.suggestSchedule('org_1', 'iss_2')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org_1/issues/iss_2/dependencies/schedule-suggestion',
      }),
      scheduleSuggestionSchema
    )
  })
})
