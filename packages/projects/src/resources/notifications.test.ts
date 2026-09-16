import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { notificationListSchema, notificationSchema } from '../types'
import { createNotificationsResource } from './notifications'

describe('notifications resource', () => {
  const resource = createNotificationsResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists notifications scoped by user', async () => {
    await resource.list('org 1', 'user_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/notifications?userId=user_1',
        signal: undefined,
      },
      notificationListSchema
    )
  })

  it('marks notifications read', async () => {
    await resource.markRead('org 1', 'ntf/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/notifications/ntf%2F1/read',
        signal: undefined,
      },
      notificationSchema
    )
  })
})
