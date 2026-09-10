import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkSyncProviderError } from '../../providers/sync/index.js'
import { pullProviderCalendar } from './sync-pull.js'

const MAPPING = {
  remoteId: 'remote_calendar_1',
  syncCursor: 'cursor_1',
  syncWindowStart: new Date('2026-01-01T00:00:00Z'),
  syncWindowEnd: new Date('2027-12-31T00:00:00Z'),
}

const EMPTY_PULL = {
  changes: [],
  cursor: 'cursor_2',
  windowStart: null,
  windowEnd: null,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('provider calendar pull recovery', () => {
  it('retries once without the cursor when a provider invalidates it', async () => {
    const pull = vi
      .fn()
      .mockRejectedValueOnce(
        new WorkSyncProviderError(
          'provider-cursor-invalid',
          'The cursor expired.'
        )
      )
      .mockResolvedValueOnce(EMPTY_PULL)

    const result = await pullProviderCalendar({
      providerName: 'GOOGLE',
      provider: { pull },
      mapping: MAPPING,
    })

    expect(result).toBe(EMPTY_PULL)
    expect(pull).toHaveBeenCalledTimes(2)
    expect(pull.mock.calls[0]?.[0]).toMatchObject({ cursor: 'cursor_1' })
    expect(pull.mock.calls[1]?.[0]).toMatchObject({ cursor: null })
  })

  it('does not retry provider failures that are unrelated to cursor state', async () => {
    const error = new WorkSyncProviderError(
      'provider-unavailable',
      'Provider unavailable.'
    )
    const pull = vi.fn().mockRejectedValue(error)

    await expect(
      pullProviderCalendar({
        providerName: 'GOOGLE',
        provider: { pull },
        mapping: MAPPING,
      })
    ).rejects.toBe(error)
    expect(pull).toHaveBeenCalledOnce()
  })

  it('rolls a Microsoft delta window before it approaches its fixed end', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T12:00:00Z'))
    const pull = vi.fn().mockResolvedValue(EMPTY_PULL)

    await pullProviderCalendar({
      providerName: 'MICROSOFT',
      provider: { pull },
      mapping: {
        ...MAPPING,
        syncWindowEnd: new Date('2026-10-01T00:00:00Z'),
      },
    })

    expect(pull).toHaveBeenCalledWith({
      remoteCalendarId: MAPPING.remoteId,
      cursor: null,
      windowStart: null,
      windowEnd: null,
    })
  })

  it('preserves the mapping cursor and window when no rollover is required', async () => {
    const pull = vi.fn().mockResolvedValue(EMPTY_PULL)

    await pullProviderCalendar({
      providerName: 'GOOGLE',
      provider: { pull },
      mapping: MAPPING,
    })

    expect(pull).toHaveBeenCalledWith({
      remoteCalendarId: MAPPING.remoteId,
      cursor: 'cursor_1',
      windowStart: Math.floor(MAPPING.syncWindowStart.getTime() / 1000),
      windowEnd: Math.floor(MAPPING.syncWindowEnd.getTime() / 1000),
    })
  })
})
