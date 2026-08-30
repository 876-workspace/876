import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createRecurrenceRulesResource } from './recurrence-rules'
import type { WorkRuntime } from '../runtime'

describe('createRecurrenceRulesResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const rules = createRecurrenceRulesResource(runtime)

  function createRuleFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'recurrence_rule',
      id: 'recrule_kin_01',
      organizationId: 'org_kingston_central',
      frequency: 'WEEKLY',
      interval: 1,
      rrule: 'FREQ=WEEKLY;BYDAY=MO;WKST=MO',
      byDay: ['MO'] as 'MO'[],
      byMonthDay: [],
      byMonth: [],
      count: null,
      untilAt: null,
      timeZone: 'America/Jamaica',
      weekStart: 'MO',
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists recurrence rules with GET method and headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createRuleFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/recurrence-rules',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await rules.list('org_kingston_central')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/recurrence-rules',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'work-internal-key',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('retrieves single recurrence rule by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createRuleFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await rules.retrieve(
      'org_kingston_central',
      'recrule_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/recurrence-rules/recrule_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('recrule_kin_01')
  })

  it('creates recurrence rule with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createRuleFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      frequency: 'WEEKLY' as const,
      byDay: ['MO'] as 'MO'[],
      timeZone: 'America/Jamaica',
      createdBy: 'usr_tariq_01',
    }
    const result = await rules.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/recurrence-rules',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.frequency).toBe('WEEKLY')
    expect(result.error).toBeNull()
  })

  it('updates recurrence rule via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createRuleFixture({
            interval: 2,
            rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;WKST=MO',
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await rules.update(
      'org_kingston_central',
      'recrule_kin_01',
      {
        interval: 2,
      }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/recurrence-rules/recrule_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ interval: 2 }),
      })
    )
    expect(result.data?.interval).toBe(2)
  })

  it('deletes recurrence rule via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'recurrence_rule',
            id: 'recrule_kin_01',
            deleted: true,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await rules.delete('org_kingston_central', 'recrule_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/recurrence-rules/recrule_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'recurrence_rule', id: 'recrule_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/recurrence-rule-not-found',
            message: 'Rule not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await rules.retrieve('org_kingston_central', 'rule_missing')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/recurrence-rule-not-found',
        message: 'Rule not found.',
      },
    })
  })
})
