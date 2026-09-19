import { describe, expect, it } from 'vitest'

import type { SessionTokens } from '../types'
import {
  clearTokens,
  isExpired,
  loadTokens,
  saveTokens,
  type TokenBackend,
} from './storage'

function memoryBackend(): TokenBackend & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value)
    },
    removeItem: async (key) => {
      store.delete(key)
    },
  }
}

const tokens: SessionTokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: Date.now() + 3600 * 1000,
  userId: 'user_1',
  organizationId: 'org_1',
}

describe('token storage', () => {
  it('round-trips tokens through one atomic blob', async () => {
    const backend = memoryBackend()
    await saveTokens(backend, tokens)
    expect(backend.store.size).toBe(1)
    expect(await loadTokens(backend)).toEqual(tokens)
  })

  it('clears every token on sign-out', async () => {
    const backend = memoryBackend()
    await saveTokens(backend, tokens)
    await clearTokens(backend)
    expect(await loadTokens(backend)).toBeNull()
  })

  it('rejects corrupt or empty payloads instead of half sessions', async () => {
    const backend = memoryBackend()
    await backend.setItem('876.projects-mobile.session.v1', 'not-json')
    expect(await loadTokens(backend)).toBeNull()
  })

  it('treats near-expiry tokens as expired', () => {
    expect(isExpired({ ...tokens, expiresAt: Date.now() + 60 * 1000 })).toBe(
      true
    )
    expect(isExpired(tokens)).toBe(false)
  })
})
