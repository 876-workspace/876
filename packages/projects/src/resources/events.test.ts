import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  eventAttendeeSchema,
  eventListSchema,
  projectEventSchema,
} from '../types'
import { createEventsResource } from './events'

describe('events resource', () => {
  const resource = createEventsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists events for an organization', async () => {
    await resource.list('org 1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/events',
        signal: undefined,
      },
      eventListSchema
    )
  })

  it('scopes the event list to a project', async () => {
    await resource.list('org 1', { projectId: 'prj_1' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/events?projectId=prj_1',
        signal: undefined,
      },
      eventListSchema
    )
  })

  it('creates an event', async () => {
    const input = { projectId: 'prj_1', title: 'Kickoff', startsAt: 1788000000 }
    await resource.create('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/events',
        body: input,
      }),
      projectEventSchema
    )
  })

  it('retrieves an event by id', async () => {
    await resource.retrieve('org 1', 'prjev_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/events/prjev_1',
        signal: undefined,
      },
      projectEventSchema
    )
  })

  it('updates an event', async () => {
    await resource.update('org 1', 'prjev_1', { title: 'Renamed' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/events/prjev_1',
      }),
      projectEventSchema
    )
  })

  it('deletes an event', async () => {
    await resource.delete('org 1', 'prjev_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/events/prjev_1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('adds an attendee', async () => {
    await resource.addAttendee('org 1', 'prjev_1', { userId: 'usr_2' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/events/prjev_1/attendees',
      }),
      eventAttendeeSchema
    )
  })

  it('records an attendee response', async () => {
    await resource.respondAttendee('org 1', 'prjev_1', 'usr 2', {
      response: 'accepted',
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/events/prjev_1/attendees/usr%202',
      }),
      eventAttendeeSchema
    )
  })

  it('removes an attendee', async () => {
    await resource.removeAttendee('org 1', 'prjev_1', 'usr_2')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/events/prjev_1/attendees/usr_2',
        signal: undefined,
      },
      deletedSchema
    )
  })
})
