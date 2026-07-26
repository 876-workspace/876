import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildStorageRuntime } from './runtime'

describe('buildStorageRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the explicit base URL before STORAGE_API_URL and removes one trailing slash', () => {
    // ARRANGE
    vi.stubEnv('STORAGE_API_URL', 'https://storage-from-env.example.test')
    const fetchMock = vi.fn<typeof fetch>()

    // ACT
    const runtime = buildStorageRuntime({
      baseUrl: 'https://storage-explicit.example.test/',
      internalKey: 'storage-service-secret',
      requestId: 'request_123',
      fetch: fetchMock,
    })

    // ASSERT
    expect(runtime).toEqual({
      baseUrl: 'https://storage-explicit.example.test',
      internalKey: 'storage-service-secret',
      requestId: 'request_123',
      fetch: fetchMock,
    })

    // AFTER — environment restored by afterEach
  })

  it('uses STORAGE_API_URL when no explicit base URL is provided', () => {
    // ARRANGE
    vi.stubEnv('STORAGE_API_URL', 'https://storage-from-env.example.test/')
    const fetchMock = vi.fn<typeof fetch>()

    // ACT
    const runtime = buildStorageRuntime({ fetch: fetchMock })

    // ASSERT
    expect(runtime).toEqual({
      baseUrl: 'https://storage-from-env.example.test',
      internalKey: undefined,
      requestId: undefined,
      fetch: fetchMock,
    })

    // AFTER — environment restored by afterEach
  })

  it('uses port 4005 when no base URL is configured', () => {
    // ARRANGE
    vi.stubEnv('STORAGE_API_URL', '')
    const fetchMock = vi.fn<typeof fetch>()

    // ACT
    const runtime = buildStorageRuntime({ fetch: fetchMock })

    // ASSERT
    expect(runtime).toEqual({
      baseUrl: 'http://localhost:4005',
      internalKey: undefined,
      requestId: undefined,
      fetch: fetchMock,
    })

    // AFTER — environment restored by afterEach
  })
})
