import { describe, expect, it, vi } from 'vitest'
import { getError } from '@876/core'
import { sendCrmError, sendCrmResult } from './result.js'

function mockRes() {
  const chainJson = vi.fn()
  const chainStatus = vi.fn(
    (code: number) => ({ json: chainJson }) as unknown as never
  )
  return {
    res: { status: chainStatus } as unknown as import('express').Response,
    chainStatus,
    chainJson,
  }
}

describe('sendCrmError - plain value contract', () => {
  it('sends correct httpStatus and client-safe error without httpStatus in body', () => {
    const { res, chainStatus, chainJson } = mockRes()
    sendCrmError(
      res as unknown as import('express').Response,
      'crm/team-not-found'
    )
    expect(chainStatus).toHaveBeenCalledWith(404)
    expect(chainJson).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/team-not-found', message: 'Team not found.' },
    })
  })

  it.each([
    ['crm/category-not-found', 404],
    ['crm/category-in-use', 409],
    ['crm/form-invalid-submission', 422],
    ['crm/registry-unavailable', 502],
    ['crm/internal', 500],
    ['crm/tenant-inactive', 409],
  ] as const)('maps %s to status %s', (code, status) => {
    const { res, chainStatus } = mockRes()
    sendCrmError(res as unknown as import('express').Response, code)
    expect(chainStatus).toHaveBeenCalledWith(status)
  })

  it('never exposes description or httpStatus in body', () => {
    const { res, chainJson } = mockRes()
    sendCrmError(res as unknown as import('express').Response, 'crm/internal')
    const body = chainJson.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >
    const error = (body as { error: Record<string, unknown> }).error
    expect(error.httpStatus).toBeUndefined()
    expect(error.description).toBeUndefined()
  })

  it('is idempotent across multiple calls', () => {
    const { res, chainStatus } = mockRes()
    sendCrmError(
      res as unknown as import('express').Response,
      'crm/request-not-found'
    )
    sendCrmError(
      res as unknown as import('express').Response,
      'crm/request-not-found'
    )
    expect(chainStatus).toHaveBeenCalledTimes(2)
  })

  it('handles all CRM codes without leaking httpStatus', () => {
    const { res, chainJson } = mockRes()
    sendCrmError(res, 'crm/priority-not-found')
    expect(
      (chainJson.mock.calls[0][0] as { error: Record<string, unknown> }).error
        .httpStatus
    ).toBeUndefined()
  })

  it('each call creates fresh envelope', () => {
    const { res: r1, chainJson: j1 } = mockRes()
    const { res: r2, chainJson: j2 } = mockRes()
    sendCrmError(r1, 'crm/team-not-found')
    sendCrmError(r2, 'crm/category-not-found')
    expect(j1.mock.calls[0][0]).not.toEqual(j2.mock.calls[0][0])
  })
})

describe('sendCrmResult - discriminates value errors vs success', () => {
  function mockRes2() {
    const chainJson = vi.fn()
    const chainStatus = vi.fn(
      (code: number) => ({ json: chainJson }) as unknown as never
    )
    return {
      res: { status: chainStatus } as unknown as import('express').Response,
      chainStatus,
      chainJson,
    }
  }

  it('sends error envelope when result is error value', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    const err = getError('crm/category-not-found')
    sendCrmResult(res, err)
    expect(chainStatus).toHaveBeenCalledWith(404)
    expect(chainJson).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/category-not-found', message: err.message },
    })
  })

  it('sends success envelope with default 200 when result is data', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    const data = { id: 'x', name: 'Billing' }
    sendCrmResult(res, data)
    expect(chainStatus).toHaveBeenCalledWith(200)
    expect(chainJson).toHaveBeenCalledWith({ data, error: null })
  })

  it('respects custom successStatus', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    sendCrmResult(res, { id: 'new' }, 201)
    expect(chainStatus).toHaveBeenCalledWith(201)
    expect(chainJson).toHaveBeenCalledWith({ data: { id: 'new' }, error: null })
  })

  it('handles null as data (not as error) with 200', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    sendCrmResult(res, null)
    expect(chainStatus).toHaveBeenCalledWith(200)
    expect(chainJson).toHaveBeenCalledWith({ data: null, error: null })
  })

  it('never confuses data that looks like error but lacks httpStatus', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    const fake = {
      code: 'crm/team-not-found',
      message: 'Team not found.',
    } as unknown as ReturnType<typeof getError>
    sendCrmResult(res, fake)
    expect(chainStatus).toHaveBeenCalledWith(200)
    expect(chainJson).toHaveBeenCalledWith({ data: fake, error: null })
  })

  it('propagates provisioning-invalid with 500', () => {
    const { res, chainStatus } = mockRes2()
    sendCrmResult(res, getError('crm/provisioning-invalid'))
    expect(chainStatus).toHaveBeenCalledWith(500)
  })

  it('does not treat generic Error as error value', () => {
    const { res, chainStatus } = mockRes2()
    const ex = new Error('boom')
    sendCrmResult(res, ex)
    expect(chainStatus).toHaveBeenCalledWith(200)
  })

  it('correctly handles array results as success', () => {
    const { res, chainStatus, chainJson } = mockRes2()
    const arr = [{ id: 'a' }, { id: 'b' }]
    sendCrmResult(res, arr)
    expect(chainStatus).toHaveBeenCalledWith(200)
    expect(chainJson).toHaveBeenCalledWith({ data: arr, error: null })
  })

  it('preserves client-safe stripping for error path', () => {
    const { res, chainJson } = mockRes2()
    const err = getError('crm/internal')
    sendCrmResult(res, err)
    const body = chainJson.mock.calls[0][0] as {
      error: Record<string, unknown>
    }
    expect(body.error.httpStatus).toBeUndefined()
  })

  it('concurrent calls do not interfere', async () => {
    const calls = await Promise.all(
      [
        'crm/team-not-found',
        'crm/category-not-found',
        'crm/request-not-found',
      ].map(async (code) => {
        const { res, chainStatus } = mockRes2()
        sendCrmResult(res, getError(code as Parameters<typeof getError>[0]))
        return chainStatus.mock.calls[0][0]
      })
    )
    expect(calls).toEqual([404, 404, 404])
  })

  it('handles undefined as success data', () => {
    const { res, chainStatus } = mockRes2()
    sendCrmResult(res, undefined)
    expect(chainStatus).toHaveBeenCalledWith(200)
  })

  it('error path json shape matches contract {data:null, error:{code,message}}', () => {
    const { res, chainJson } = mockRes2()
    sendCrmResult(res, getError('crm/task-not-found'))
    const body = chainJson.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >
    expect(body).toHaveProperty('data', null)
    expect(body).toHaveProperty('error')
    expect((body.error as unknown as Record<string, unknown>).code).toBe(
      'crm/task-not-found'
    )
  })
})
