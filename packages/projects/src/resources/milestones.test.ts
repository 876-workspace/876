import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import {
  milestoneCommentListSchema,
  milestoneCommentSchema,
  milestoneCustomFieldListSchema,
  milestoneCustomFieldValueListSchema,
  milestoneDetailListSchema,
  milestoneDetailSchema,
  milestoneEventListSchema,
  milestoneSummarySchema,
} from '../milestone-details'
import { request } from '../request'
import { buildRuntime } from '../runtime'
import { deletedSchema } from '../types'
import { createMilestonesResource } from './milestones'

describe('milestones resource', () => {
  const resource = createMilestonesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('keeps project-scoped list compatibility and supports organization phase listing', async () => {
    await resource.list('org 1', 'prj/1', { status: 'open' })
    await resource.listAll('org 1', { status: 'completed' })

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/milestones?projectId=prj%2F1&status=open',
        signal: undefined,
      },
      milestoneDetailListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/milestones/all?status=completed',
        signal: undefined,
      },
      milestoneDetailListSchema
    )
  })

  it('uses extended phase detail schemas for CRUD and collaboration resources', async () => {
    const input = {
      projectId: 'prj_1',
      key: 'launch',
      name: 'Launch',
      ownerUserId: 'usr_1',
    }
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'ms/1')
    await resource.update('org 1', 'ms/1', { status: 'completed' })
    await resource.summary.retrieve('org 1', 'ms/1')
    await resource.comments.list('org 1', 'ms/1')
    await resource.comments.create('org 1', 'ms/1', {
      body: 'Ready',
      authorUserId: 'usr_1',
    })
    await resource.events.list('org 1', 'ms/1')
    await resource.customFields.list('org 1')
    await resource.customFields.values.list('org 1', 'ms/1')
    await resource.delete('org 1', 'ms/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/milestones',
        body: input,
      }),
      milestoneDetailSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%201/milestones/ms%2F1',
      }),
      milestoneDetailSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
      milestoneDetailSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      expect.objectContaining({ path: '/v1/organizations/org%201/milestones/ms%2F1/summary' }),
      milestoneSummarySchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      expect.objectContaining({ path: '/v1/organizations/org%201/milestones/ms%2F1/comments' }),
      milestoneCommentListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      6,
      expect.anything(),
      expect.objectContaining({ method: 'POST' }),
      milestoneCommentSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      7,
      expect.anything(),
      expect.objectContaining({ path: '/v1/organizations/org%201/milestones/ms%2F1/events' }),
      milestoneEventListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      8,
      expect.anything(),
      expect.objectContaining({ path: '/v1/organizations/org%201/milestone-custom-fields' }),
      milestoneCustomFieldListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      9,
      expect.anything(),
      expect.objectContaining({ path: '/v1/organizations/org%201/milestones/ms%2F1/custom-field-values' }),
      milestoneCustomFieldValueListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      10,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/milestones/ms%2F1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/project-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1', 'prj_1')).resolves.toEqual({
      data: null,
      error,
    })
  })
})
