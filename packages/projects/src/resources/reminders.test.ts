import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  dueReminderListSchema,
  reminderListSchema,
  reminderSchema,
} from '../types'
import { createRemindersResource } from './reminders'

describe('reminders resource', () => {
  const resource = createRemindersResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists reminders scoped to their creator', async () => {
    await resource.list('org 1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reminders?createdBy=usr_1',
        signal: undefined,
      },
      reminderListSchema
    )
  })

  it('creates a reminder', async () => {
    const input = {
      issueId: 'iss_1',
      remindAt: 1788000000,
      createdBy: 'usr_1',
    }
    await resource.create('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/reminders',
        body: input,
      }),
      reminderSchema
    )
  })

  it('updates a reminder as its creator', async () => {
    await resource.update('org 1', 'prjrem_1', 'usr_1', { active: false })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/reminders/prjrem_1?userId=usr_1',
      }),
      reminderSchema
    )
  })

  it('deletes a reminder as its creator', async () => {
    await resource.delete('org 1', 'prjrem_1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/reminders/prjrem_1?userId=usr_1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('reads due reminders with an explicit moment', async () => {
    await resource.due('org 1', { at: 1788000000, createdBy: 'usr_1' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reminders/due?at=1788000000&createdBy=usr_1',
        signal: undefined,
      },
      dueReminderListSchema
    )
  })
})
