import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  issueRelationListSchema,
  issueRelationSchema,
} from '../types'
import { createIssueRelationsResource } from './issue-relations'

describe('issue-relations resource', () => {
  const resource = createIssueRelationsResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists relations scoped to an issue', async () => {
    await resource.list('org 1', 'CONSOLE-12')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/issues/CONSOLE-12/relations',
        signal: undefined,
      },
      issueRelationListSchema
    )
  })

  it('encodes issue refs with special characters', async () => {
    await resource.list('org 1', 'iss/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%201/issues/iss%2F1/relations',
      }),
      issueRelationListSchema
    )
  })

  it('creates a blocks relation for an issue', async () => {
    const input = { targetIssueId: 'iss_2', type: 'blocks' as const }
    await resource.create('org 1', 'iss_1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/issues/iss_1/relations',
        body: input,
      }),
      issueRelationSchema
    )
  })

  it('creates a relates-to relation with an actor', async () => {
    const input = {
      targetIssueId: 'iss_2',
      type: 'relates-to' as const,
      actorUserId: 'usr_1',
    }
    await resource.create('org 1', 'iss_1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'POST', body: input }),
      issueRelationSchema
    )
  })

  it('deletes a relation by id', async () => {
    await resource.delete('org 1', 'iss_1', 'isr_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org%201/issues/iss_1/relations/isr_1',
      }),
      deletedSchema
    )
  })

  it('forwards an abort signal on list', async () => {
    const controller = new AbortController()
    await resource.list('org 1', 'iss_1', { signal: controller.signal })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
      issueRelationListSchema
    )
  })

  it('is reachable from the shared client', async () => {
    const { create876ProjectsClient } = await import('../client')
    const client = create876ProjectsClient({ internalKey: 'key' })

    await client.issueRelations.list('org_1', 'iss_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org_1/issues/iss_1/relations',
      }),
      issueRelationListSchema
    )
  })
})
