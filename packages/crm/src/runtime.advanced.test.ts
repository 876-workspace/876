import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRuntime } from './runtime.js'

describe('buildRuntime', () => {
  const originalEnv = process.env
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.CRM_API_URL
    delete process.env.CRM_URL
    delete process.env.NEXT_PUBLIC_CRM_API_URL
    delete process.env.NEXT_PUBLIC_CRM_URL
  })
  afterEach(() => {
    process.env = originalEnv
  })

  it('uses explicit baseUrl and strips trailing slash', () => {
    const r = buildRuntime({ baseUrl: 'http://example.test/' })
    expect(r.baseUrl).toBe('http://example.test')
  })
  it('falls back to localhost when no baseUrl or env', () => {
    const r = buildRuntime({})
    expect(r.baseUrl).toBe('http://localhost:4010')
  })
  it('prefers explicit baseUrl over env', () => {
    process.env.CRM_API_URL = 'http://env.test'
    const r = buildRuntime({ baseUrl: 'http://explicit.test' })
    expect(r.baseUrl).toBe('http://explicit.test')
  })
  it('uses CRM_API_URL env when no explicit baseUrl', () => {
    process.env.CRM_API_URL = 'http://env.test/'
    const r = buildRuntime({})
    expect(r.baseUrl).toBe('http://env.test')
  })
  it('binds global fetch by default', () => {
    const r = buildRuntime({})
    expect(typeof r.fetch).toBe('function')
  })
  it('uses provided fetch', () => {
    const f = vi.fn() as unknown as typeof fetch
    const r = buildRuntime({ fetch: f })
    expect(r.fetch).toBe(f)
  })
  it('passes through internalKey and requestId', () => {
    const r = buildRuntime({ internalKey: 'key', requestId: 'req_1' })
    expect(r.internalKey).toBe('key')
    expect(r.requestId).toBe('req_1')
  })
  it('internalKey undefined when not provided', () => {
    const r = buildRuntime({})
    expect(r.internalKey).toBeUndefined()
  })
})
