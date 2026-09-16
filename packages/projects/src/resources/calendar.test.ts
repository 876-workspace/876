import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { calendarSchema } from '../types'
import { createCalendarResource } from './calendar'

describe('calendar resource', () => {
  const resource = createCalendarResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('retrieves calendar entries inside a window', async () => {
    await resource.retrieve('org 1', { from: 1788000000, to: 1788086400 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/calendar?from=1788000000&to=1788086400',
        signal: undefined,
      },
      calendarSchema
    )
  })

  it('forwards the project and kind filters', async () => {
    await resource.retrieve('org 1', {
      from: 1788000000,
      to: 1788086400,
      projectId: 'prj_1',
      kinds: ['event', 'meeting'],
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/calendar?from=1788000000&to=1788086400&projectId=prj_1&kinds=event%2Cmeeting',
        signal: undefined,
      },
      calendarSchema
    )
  })
})
