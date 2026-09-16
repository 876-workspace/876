import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  timesheetDetailSchema,
  timesheetEventListSchema,
  timesheetListSchema,
} from '../types'
import { createTimesheetsResource } from './timesheets'

describe('timesheets resource', () => {
  const resource = createTimesheetsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists timesheets filtered by owner and status', async () => {
    await resource.list('org 1', { userId: 'usr_1', status: 'submitted' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/timesheets?userId=usr_1&status=submitted',
        signal: undefined,
      },
      timesheetListSchema
    )
  })

  it('creates a draft timesheet', async () => {
    const input = {
      userId: 'usr_1',
      periodStart: 1787950000,
      periodEnd: 1788036400,
      entryIds: ['tme_1'],
    }
    await resource.create('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/timesheets',
        body: input,
      }),
      timesheetDetailSchema
    )
  })

  it('retrieves a timesheet with entries and totals', async () => {
    await resource.retrieve('org 1', 'tsh_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/timesheets/tsh_1',
        signal: undefined,
      },
      timesheetDetailSchema
    )
  })

  it('submits a timesheet as its owner', async () => {
    await resource.submit('org 1', 'tsh_1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/timesheets/tsh_1/submit',
        body: { userId: 'usr_1' },
      }),
      timesheetDetailSchema
    )
  })

  it('approves a timesheet as a different reviewer', async () => {
    await resource.approve('org 1', 'tsh_1', { decidedBy: 'usr_lead' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/timesheets/tsh_1/approve',
        body: { decidedBy: 'usr_lead' },
      }),
      timesheetDetailSchema
    )
  })

  it('rejects a timesheet with a reason', async () => {
    await resource.reject('org 1', 'tsh_1', {
      decidedBy: 'usr_lead',
      note: 'Missing Friday entries',
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/timesheets/tsh_1/reject',
      }),
      timesheetDetailSchema
    )
  })

  it('recalls a submitted timesheet as its owner', async () => {
    await resource.recall('org 1', 'tsh_1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/timesheets/tsh_1/recall',
        body: { userId: 'usr_1' },
      }),
      timesheetDetailSchema
    )
  })

  it('lists transition events for a timesheet', async () => {
    await resource.events('org 1', 'tsh_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/timesheets/tsh_1/events',
        signal: undefined,
      },
      timesheetEventListSchema
    )
  })
})
