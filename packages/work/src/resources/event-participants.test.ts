import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEventParticipantsResource } from './event-participants'
import type { WorkRuntime } from '../runtime'

describe('createEventParticipantsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const participants = createEventParticipantsResource(runtime)

  function createParticipantFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'event_participant',
      id: 'part_kin_01',
      eventId: 'event_kin_01',
      kind: 'USER',
      participantId: 'usr_claudia_01',
      email: null,
      name: 'Claudia Blake',
      role: 'REQUIRED',
      status: 'NEEDS_ACTION',
      delegatedTo: null,
      delegatedFrom: null,
      respondedAt: null,
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists event participants with GET and organization/event path', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createParticipantFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/events/event_kin_01/participants',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await participants.list('org_kingston_central', 'event_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01/participants',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('creates an event participant with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createParticipantFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = { kind: 'USER' as const, participantId: 'usr_claudia_01' }
    const result = await participants.create('org_kingston_central', 'event_kin_01', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01/participants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.id).toBe('part_kin_01')
    expect(result.error).toBeNull()
  })

  it('updates an event participant via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createParticipantFixture({ status: 'ACCEPTED' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await participants.update(
      'org_kingston_central',
      'event_kin_01',
      'part_kin_01',
      { status: 'ACCEPTED' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01/participants/part_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })
    )
    expect(result.data?.status).toBe('ACCEPTED')
    expect(result.error).toBeNull()
  })

  it('deletes an event participant via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'event_participant', id: 'part_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await participants.delete('org_kingston_central', 'event_kin_01', 'part_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01/participants/part_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'event_participant', id: 'part_kin_01', deleted: true },
      error: null,
    })
  })

  it('encodes special characters in path parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'list', data: [], has_more: false, total_count: null, url: '' },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await participants.list('org/1', 'event/1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2F1/events/event%2F1/participants',
      expect.any(Object)
    )
  })

  it('propagates errors as { data: null, error } rather than throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/event-participant-not-found', message: 'Participant not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await participants.delete('org_kingston_central', 'event_kin_01', 'part_missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'work/event-participant-not-found', message: 'Participant not found.' },
    })
  })
})
