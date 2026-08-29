import { describe, expect, it, vi } from 'vitest'
import { getError } from '@876/core'
import { sendCrmList } from './result.js'

function mockRes() {
  const chainJson = vi.fn()
  const chainStatus = vi.fn((code: number) => ({ json: chainJson } as unknown as never))
  const json = vi.fn()
  return { res: { status: chainStatus, json } as unknown as import('express').Response, chainStatus, chainJson, json }
}

describe('sendCrmList - list envelope contract', () => {
  it('sends error envelope when result is error value', () => {
    const { res, chainStatus, chainJson } = mockRes()
    sendCrmList(res, getError('crm/category-not-found'), '/v1/organizations/org_1/request-categories')
    expect(chainStatus).toHaveBeenCalledWith(404)
    expect(chainJson).toHaveBeenCalledWith({ data: null, error: { code: 'crm/category-not-found', message: 'Request category not found.' } })
  })

  it('sends list envelope with object list metadata', () => {
    const { res, json } = mockRes()
    // sendCrmList uses res.json directly for success (no status), so test json
    const rows = [{ id: 'cat_1' }, { id: 'cat_2' }]
    sendCrmList(res, rows as unknown as never, '/v1/organizations/org_1/request-categories')
    // For success path, implementation calls res.json (not status+ json). Check mock
    // Our mock res has json separate; verify at least one json called with list shape
    const called = (json.mock.calls.length > 0 ? json : (res as unknown as { json: typeof json }).json)
    // Instead check via chainJson fallback: sendCrmList success uses res.json, so we need to capture it
    // Re-mock correctly
    const json2 = vi.fn()
    const res2 = { json: json2, status: vi.fn() } as unknown as import('express').Response
    sendCrmList(res2, rows as unknown as never, '/v1/organizations/org_1/request-categories')
    expect(json2).toHaveBeenCalledWith({
      data: { object: 'list', data: rows, has_more: false, total_count: rows.length, url: '/v1/organizations/org_1/request-categories' },
      error: null,
    })
  })

  it('handles empty list as success not error', () => {
    const json = vi.fn()
    const res = { json, status: vi.fn() } as unknown as import('express').Response
    sendCrmList(res, [] as unknown as never, '/v1/organizations/org_1/teams')
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total_count: 0, data: [] }) }))
  })

  it('propagates tenant-inactive with 409', () => {
    const { res, chainStatus } = mockRes()
    sendCrmList(res, getError('crm/tenant-inactive'), '/v1/orgs/o/requests')
    expect(chainStatus).toHaveBeenCalledWith(409)
  })

  it('never leaks httpStatus in error body', () => {
    const chainJson = vi.fn()
    const chainStatus = vi.fn((code: number) => ({ json: chainJson } as unknown as never))
    const res = { status: chainStatus } as unknown as import('express').Response
    sendCrmList(res, getError('crm/internal'), '/v1/orgs/o/requests')
    const body = chainJson.mock.calls[0][0] as { error: Record<string, unknown> }
    expect(body.error.httpStatus).toBeUndefined()
  })

  it('success list preserves ordering', () => {
    const json = vi.fn()
    const res = { json, status: vi.fn() } as unknown as import('express').Response
    const rows = [{ id: 'b' }, { id: 'a' }]
    sendCrmList(res, rows as unknown as never, '/u')
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ data: rows }) }))
  })

  it('error path is plain value not Error instance', () => {
    const err = getError('crm/tenant-not-found')
    expect(err).not.toBeInstanceOf(Error)
    const chainJson = vi.fn()
    const chainStatus = vi.fn((code: number) => ({ json: chainJson } as unknown as never))
    const res = { status: chainStatus } as unknown as import('express').Response
    sendCrmList(res, err, '/u')
    expect(chainStatus).toHaveBeenCalledWith(404)
  })
})
