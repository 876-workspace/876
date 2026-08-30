import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createExportsResource } from './exports'
import type { WorkRuntime } from '../runtime'

describe('createExportsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const exports = createExportsResource(runtime)

  function createExportFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'calendar_export',
      format: 'ics',
      filename: '876-work.ics',
      contentType: 'text/calendar; charset=utf-8',
      content: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n',
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports calendar in ics format with POST payload and headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createExportFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      format: 'ics' as const,
      includeTasks: true,
      includeEvents: true,
    }
    const result = await exports.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/exports',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-key': 'work-internal-key',
        }),
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.object).toBe('calendar_export')
    expect(result.data?.format).toBe('ics')
    expect(result.error).toBeNull()
  })

  it('exports calendar in jscalendar format', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createExportFixture({
            format: 'jscalendar',
            filename: '876-work.json',
            contentType: 'application/jscalendar+json; charset=utf-8',
            content: '{"@type":"Group"}',
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      format: 'jscalendar' as const,
      taskListId: 'tasklist_01',
    }
    const result = await exports.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/exports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.format).toBe('jscalendar')
    expect(result.data?.filename).toBe('876-work.json')
  })

  it('filters export by calendarId', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createExportFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      format: 'ics' as const,
      calendarId: 'calendar_kin_01',
    }
    await exports.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/exports',
      expect.objectContaining({
        body: JSON.stringify(input),
      })
    )
  })

  it('encodes organizationId path parameter safely', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createExportFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await exports.create('org/special:name', { format: 'ics' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2Fspecial%3Aname/exports',
      expect.any(Object)
    )
  })

  it('propagates invalid-response error when server returns non-matching structure', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { wrong: 'shape' },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await exports.create('org_kingston_central', {
      format: 'ics',
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/invalid-response',
        message: 'Work API returned an invalid response.',
      },
    })
  })

  it('propagates API error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/tenant-inactive',
            message: 'Workspace inactive',
          },
        }),
        { status: 409, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await exports.create('org_kingston_central', {
      format: 'ics',
    })

    expect(result).toEqual({
      data: null,
      error: { code: 'work/tenant-inactive', message: 'Workspace inactive' },
    })
  })
})
