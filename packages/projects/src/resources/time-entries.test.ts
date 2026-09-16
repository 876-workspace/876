import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  timeEntryListSchema,
  timeEntrySchema,
  timerStartResultSchema,
  timeSummarySchema,
} from '../types'
import { createTimeEntriesResource } from './time-entries'

describe('time entries resource', () => {
  const resource = createTimeEntriesResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists entries with filter query params', async () => {
    await resource.list('org 1', {
      userId: 'usr_1',
      projectId: 'prj_1',
      billable: true,
      approvalStatus: 'draft',
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/time-entries?userId=usr_1&projectId=prj_1&billable=true&approvalStatus=draft',
        signal: undefined,
      },
      timeEntryListSchema
    )
  })

  it('creates a manual entry', async () => {
    const input = {
      userId: 'usr_1',
      projectId: 'prj_1',
      startedAt: 1788000000,
      endedAt: 1788003600,
      billable: true,
    }
    await resource.create('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/time-entries',
        body: input,
      }),
      timeEntrySchema
    )
  })

  it('retrieves a single entry', async () => {
    await resource.retrieve('org 1', 'tme_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/time-entries/tme_1',
        signal: undefined,
      },
      timeEntrySchema
    )
  })

  it('updates an entry with the acting owner', async () => {
    await resource.update('org 1', 'tme_1', 'usr_1', { note: 'Deep work' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/time-entries/tme_1',
        body: { note: 'Deep work', userId: 'usr_1' },
      }),
      timeEntrySchema
    )
  })

  it('deletes an entry scoped to its owner', async () => {
    await resource.delete('org 1', 'tme_1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/time-entries/tme_1?userId=usr_1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('starts a timer', async () => {
    const input = { userId: 'usr_1', projectId: 'prj_1', billable: false }
    await resource.startTimer('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/time-entries/timer/start',
        body: input,
      }),
      timerStartResultSchema
    )
  })

  it('stops the running timer', async () => {
    await resource.stopTimer('org 1', { userId: 'usr_1', endedAt: 1788003600 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/time-entries/timer/stop',
      }),
      timeEntrySchema
    )
  })

  it('reads the current running timer', async () => {
    await resource.currentTimer('org 1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/time-entries/timer/current?userId=usr_1',
        signal: undefined,
      },
      expect.anything()
    )
  })

  it('summarizes time grouped by project', async () => {
    await resource.summary('org 1', {
      groupBy: 'project',
      from: 1787950000,
      to: 1788036400,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/time-summary?groupBy=project&from=1787950000&to=1788036400',
        signal: undefined,
      },
      timeSummarySchema
    )
  })
})
