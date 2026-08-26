import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startOfflineRecovery } from './offline-recovery-runtime'

const PROBE_URL = '/pwa/offline-recovery.js'

function renderOfflinePage() {
  document.body.innerHTML =
    '<button data-offline-retry type="button">Try again</button>'
  return document.querySelector<HTMLButtonElement>('[data-offline-retry]')!
}

function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockReload() {
  const reload = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })
  return reload
}

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

/** Lets the probe's promise chain settle without advancing the fake clock. */
async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('startOfflineRecovery', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    setOnLine(true)
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('reloads immediately when the first probe reaches the origin', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const reload = mockReload()

    stop = startOfflineRecovery()
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /^\/pwa\/offline-recovery\.js\?probe=\d+$/
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
    })
  })

  it('treats any HTTP status as proof the network is reachable', async () => {
    renderOfflinePage()
    mockFetch().mockResolvedValue(new Response(null, { status: 404 }))
    const reload = mockReload()

    stop = startOfflineRecovery()
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload while the probe keeps failing', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const reload = mockReload()

    stop = startOfflineRecovery({ initialDelayMs: 1000 })
    await settle()

    expect(reload).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(reload).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('recovers on a later poll once connectivity returns, with no online event', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const reload = mockReload()

    stop = startOfflineRecovery({ initialDelayMs: 1000 })
    await settle()
    expect(reload).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('backs off between failed probes up to the configured maximum', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    mockReload()

    stop = startOfflineRecovery({
      initialDelayMs: 1000,
      backoffFactor: 2,
      maxDelayMs: 2000,
    })
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(999)
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1999)
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('probes at once when the browser reports it is back online', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const reload = mockReload()

    stop = startOfflineRecovery({ initialDelayMs: 60_000 })
    await settle()
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    window.dispatchEvent(new Event('online'))
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('probes at once when the tab becomes visible again', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const reload = mockReload()

    stop = startOfflineRecovery({ initialDelayMs: 60_000 })
    await settle()

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('skips the network probe while the browser reports no connection', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    const reload = mockReload()
    setOnLine(false)

    stop = startOfflineRecovery({ initialDelayMs: 1000 })
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads on click without waiting for a probe', async () => {
    const retry = renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const reload = mockReload()

    stop = startOfflineRecovery({ initialDelayMs: 60_000 })
    await settle()

    retry.click()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(retry.disabled).toBe(true)
    expect(retry.textContent).toBe('Reconnecting...')
  })

  it('reloads only once when a probe and a click race', async () => {
    const retry = renderOfflinePage()
    mockFetch().mockResolvedValue(new Response(null, { status: 200 }))
    const reload = mockReload()

    stop = startOfflineRecovery()
    await settle()

    retry.click()
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('runs without a retry button so a fallback page can omit one', async () => {
    document.body.innerHTML = '<p>You are offline</p>'
    mockFetch().mockResolvedValue(new Response(null, { status: 200 }))
    const reload = mockReload()

    stop = startOfflineRecovery()
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('stops probing after the returned teardown runs', async () => {
    renderOfflinePage()
    const fetchMock = mockFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const reload = mockReload()

    const teardown = startOfflineRecovery({ initialDelayMs: 1000 })
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    teardown()
    await vi.advanceTimersByTimeAsync(5000)
    window.dispatchEvent(new Event('online'))
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
  })
})
