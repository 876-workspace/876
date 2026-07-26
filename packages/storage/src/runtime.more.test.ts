import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildStorageRuntime } from './runtime'

describe('buildStorageRuntime additional cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('preserves internalKey and requestId as provided', () => {
    const runtime = buildStorageRuntime({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      requestId: 'req_1',
    })

    expect(runtime.internalKey).toBe('secret')
    expect(runtime.requestId).toBe('req_1')
  })

  it('falls back to globalThis.fetch when fetch is omitted', () => {
    const runtime = buildStorageRuntime({
      baseUrl: 'https://storage.example.test',
    })

    expect(typeof runtime.fetch).toBe('function')
  })

  it('prefers explicit baseUrl over STORAGE_API_URL even when env is set', () => {
    vi.stubEnv('STORAGE_API_URL', 'https://env.example.test')

    const runtime = buildStorageRuntime({
      baseUrl: 'https://explicit.example.test',
    })

    expect(runtime.baseUrl).toBe('https://explicit.example.test')
  })

  it('does not treat whitespace-only env as a valid base URL override of default', () => {
    vi.stubEnv('STORAGE_API_URL', '')

    const runtime = buildStorageRuntime({})

    expect(runtime.baseUrl).toBe('http://localhost:4005')
  })

  it('only strips a single trailing slash', () => {
    const runtime = buildStorageRuntime({
      baseUrl: 'https://storage.example.test/',
    })

    expect(runtime.baseUrl).toBe('https://storage.example.test')
  })
})
