import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  baselineComparisonSchema,
  baselineDetailSchema,
  baselineListSchema,
  deletedSchema,
} from '../types'
import { createBaselinesResource } from './baselines'

describe('baselines resource', () => {
  const resource = createBaselinesResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists baselines for a project', async () => {
    await resource.list('org 1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/baselines',
        signal: undefined,
      },
      baselineListSchema
    )
  })

  it('creates a baseline snapshot', async () => {
    const input = { name: 'Sprint 1', note: 'kickoff', capturedBy: 'usr_1' }
    await resource.create('org 1', 'prj_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/projects/prj_1/baselines',
        body: input,
      }),
      baselineDetailSchema
    )
  })

  it('retrieves a baseline by id', async () => {
    await resource.retrieve('org 1', 'prjbl_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/baselines/prjbl_1',
        signal: undefined,
      },
      baselineDetailSchema
    )
  })

  it('deletes a baseline by id', async () => {
    await resource.delete('org 1', 'prjbl_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org%201/projects/baselines/prjbl_1',
      }),
      deletedSchema
    )
  })

  it('fetches a baseline comparison', async () => {
    await resource.comparison('org 1', 'prj_1', 'prjbl_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/baselines/prjbl_1/comparison',
        signal: undefined,
      },
      baselineComparisonSchema
    )
  })

  it('validates a comparison payload with positive and negative variance', () => {
    const parsed = baselineComparisonSchema.safeParse({
      object: 'baseline-comparison',
      baselineId: 'prjbl_1',
      projectId: 'prj_1',
      items: [
        {
          object: 'baseline-comparison-item',
          issueId: 'iss_1',
          identifier: 'BASE-1',
          baselineStart: 1000,
          baselineFinish: 2000,
          currentStart: 1600,
          currentFinish: 1400,
          startVarianceMinutes: 10,
          finishVarianceMinutes: -10,
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })
})
