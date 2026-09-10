import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sync-connections.repository.js', () => ({
  acquireSyncLease: vi.fn(),
  heartbeatSyncLease: vi.fn(),
  releaseSyncLease: vi.fn(),
}))

import * as repository from './sync-connections.repository.js'
import { runWithLease } from './sync-lease.service.js'

const acquireSyncLease = vi.mocked(repository.acquireSyncLease)
const heartbeatSyncLease = vi.mocked(repository.heartbeatSyncLease)
const releaseSyncLease = vi.mocked(repository.releaseSyncLease)

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('sync lease', () => {
  it('does not run provider work when another instance holds the lease', async () => {
    acquireSyncLease.mockResolvedValue(false)
    const work = vi.fn()

    const result = await runWithLease('connection_1', work)

    expect(result).toEqual({ acquired: false })
    expect(work).not.toHaveBeenCalled()
    expect(releaseSyncLease).not.toHaveBeenCalled()
  })

  it('releases the acquired token after successful work', async () => {
    acquireSyncLease.mockResolvedValue(true)
    releaseSyncLease.mockResolvedValue(true)

    const result = await runWithLease('connection_1', async () => 'done')

    expect(result).toEqual({ acquired: true, result: 'done' })
    expect(releaseSyncLease).toHaveBeenCalledOnce()
    expect(releaseSyncLease.mock.calls[0]?.[0]).toBe('connection_1')
    expect(releaseSyncLease.mock.calls[0]?.[1]).toEqual(expect.any(String))
  })

  it('releases the lease when provider work throws', async () => {
    acquireSyncLease.mockResolvedValue(true)
    releaseSyncLease.mockResolvedValue(true)

    await expect(
      runWithLease('connection_1', async () => {
        throw new Error('provider failed')
      })
    ).rejects.toThrow('provider failed')

    expect(releaseSyncLease).toHaveBeenCalledOnce()
  })

  it('heartbeats a long-running lease before its expiry window', async () => {
    vi.useFakeTimers()
    acquireSyncLease.mockResolvedValue(true)
    heartbeatSyncLease.mockResolvedValue(true)
    releaseSyncLease.mockResolvedValue(true)
    let finish: (() => void) | null = null
    const work = new Promise<void>((resolve) => {
      finish = resolve
    })

    const running = runWithLease('connection_1', () => work)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(heartbeatSyncLease).toHaveBeenCalled()
    expect(heartbeatSyncLease.mock.calls[0]?.[0]).toMatchObject({
      id: 'connection_1',
      token: expect.any(String),
      now: expect.any(Date),
      expiresAt: expect.any(Date),
    })

    finish?.()
    await running
  })

  it('serializes two instance attempts for the same connection through the repository CAS', async () => {
    acquireSyncLease.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    releaseSyncLease.mockResolvedValue(true)
    let finishFirst: (() => void) | null = null
    const firstWork = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishFirst = () => resolve('first-done')
        })
    )
    const secondWork = vi.fn(async () => 'second-done')

    const first = runWithLease('connection_1', firstWork)
    const second = await runWithLease('connection_1', secondWork)

    expect(second).toEqual({ acquired: false })
    expect(secondWork).not.toHaveBeenCalled()
    expect(firstWork).toHaveBeenCalledOnce()

    finishFirst?.()
    await expect(first).resolves.toEqual({
      acquired: true,
      result: 'first-done',
    })
  })
})
