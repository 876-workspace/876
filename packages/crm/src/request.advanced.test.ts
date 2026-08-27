import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
vi.mock('@876/core/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@876/core/client')>()),
  sendClientRequest: vi.fn(),
}))

import { sendClientRequest } from '@876/core/client'
import { request } from './request.js'
import { buildRuntime } from './runtime.js'
import type { ClientOptions } from './types.js'

/** The transport's real result shape, so a stub cannot drift from it. */
type ClientResponse = Awaited<ReturnType<typeof sendClientRequest>>

const mockSend = vi.mocked(sendClientRequest)
const schema = z.object({ object: z.literal('request'), id: z.string() })

function runtime(overrides: Partial<ClientOptions> = {}) {
  return buildRuntime({
    baseUrl: 'http://crm.test',
    internalKey: 'key',
    ...overrides,
  })
}

beforeEach(() => vi.clearAllMocks())

describe('request - contract', () => {
  it('fails closed when internalKey missing', async () => {
    const r = buildRuntime({ baseUrl: 'http://crm.test' })
    const res = await request(
      r,
      { method: 'GET', path: '/v1/organizations/org_1/requests' },
      schema
    )
    expect(res).toEqual({
      data: null,
      error: { code: 'crm/not-configured', message: expect.any(String) },
    })
    expect(mockSend).not.toHaveBeenCalled()
  })
  it('forwards x-internal-key and x-request-id', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { data: { object: 'request', id: 'crm_req_1' }, error: null },
    } as unknown as ClientResponse)
    const rt = buildRuntime({
      baseUrl: 'http://crm.test',
      internalKey: 'secret',
      requestId: 'req_123',
    })
    await request(rt, { method: 'GET', path: '/x' }, schema)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-internal-key': 'secret',
          'x-request-id': 'req_123',
        }),
      })
    )
  })
  it('returns network/offline on networkError', async () => {
    mockSend.mockResolvedValue({
      networkError: true,
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res).toEqual({
      data: null,
      error: { code: 'network/offline', message: expect.any(String) },
    })
  })
  it('returns invalid-response when envelope is malformed', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { bad: true },
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res.error?.code).toBe('crm/invalid-response')
  })
  it('returns envelope error directly', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: {
        data: null,
        error: { code: 'crm/team-not-found', message: 'Team not found.' },
      },
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res).toEqual({
      data: null,
      error: { code: 'crm/team-not-found', message: 'Team not found.' },
    })
  })
  it('returns invalid-response when data fails zod validation', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { data: { object: 'request', id: 123 }, error: null },
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res.error?.code).toBe('crm/invalid-response')
  })
  it('returns invalid-response when http not ok even if data matches', async () => {
    mockSend.mockResolvedValue({
      ok: false,
      payload: { data: { object: 'request', id: 'crm_req_1' }, error: null },
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res.error?.code).toBe('crm/invalid-response')
  })
  it('succeeds on valid payload', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { data: { object: 'request', id: 'crm_req_1' }, error: null },
    } as unknown as ClientResponse)
    const res = await request(runtime(), { method: 'GET', path: '/x' }, schema)
    expect(res).toEqual({
      data: { object: 'request', id: 'crm_req_1' },
      error: null,
    })
  })
  it('passes through signal', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { data: { object: 'request', id: 'crm_req_1' }, error: null },
    } as unknown as ClientResponse)
    const controller = new AbortController()
    await request(
      runtime(),
      { method: 'GET', path: '/x', signal: controller.signal },
      schema
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal })
    )
  })
})
