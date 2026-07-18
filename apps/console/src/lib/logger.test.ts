import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logger } from './logger'

describe('Console logger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T12:00:00.000Z'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'info')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('filters messages below the configured level', () => {
    logger.debug({ requestId: 'req_123' }, 'hidden')

    expect(console.log).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('emits structured production info to stdout', () => {
    logger.info({ requestId: 'req_123', userId: 'user_123' }, 'user loaded')

    expect(console.log).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'info',
        msg: 'user loaded',
        requestId: 'req_123',
        userId: 'user_123',
        time: 1_783_771_200_000,
      })
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([
    ['warn', 'warn message'],
    ['error', 'error message'],
  ] as const)('emits %s messages to stderr', (level, message) => {
    logger[level]({}, message)

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.log).not.toHaveBeenCalled()
  })

  it('formats development output with serialized context', () => {
    vi.stubEnv('NODE_ENV', 'development')

    logger.info({ requestId: 'req_123' }, 'user loaded')

    expect(console.log).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith(
      '[2026-07-11T12:00:00.000Z] INFO user loaded {"requestId":"req_123"}'
    )
  })

  it('formats development output without an empty context suffix', () => {
    vi.stubEnv('NODE_ENV', 'development')

    logger.info({}, 'ready')

    expect(console.log).toHaveBeenCalledWith(
      '[2026-07-11T12:00:00.000Z] INFO ready'
    )
  })

  it.each([
    ['debug', 'debug', true],
    ['info', 'debug', false],
    ['warn', 'info', false],
    ['error', 'warn', false],
    ['invalid', 'debug', false],
    [undefined, 'info', true],
  ] as const)(
    'applies configured level %s to %s output',
    (configured, emitted, shouldEmit) => {
      if (configured === undefined) vi.stubEnv('LOG_LEVEL', undefined)
      else vi.stubEnv('LOG_LEVEL', configured)

      logger[emitted]({}, 'message')

      const count =
        vi.mocked(console.log).mock.calls.length +
        vi.mocked(console.error).mock.calls.length
      expect(count).toBe(shouldEmit ? 1 : 0)
    }
  )
})
