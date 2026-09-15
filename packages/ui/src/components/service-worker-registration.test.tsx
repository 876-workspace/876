import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ServiceWorkerRegistration } from './service-worker-registration'

function installServiceWorkerMock() {
  const register = vi.fn().mockResolvedValue({})
  const getRegistrations = vi.fn().mockResolvedValue([])
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register,
      getRegistrations,
      addEventListener,
      removeEventListener,
    },
  })

  return {
    register,
    getRegistrations,
    addEventListener,
    removeEventListener,
  }
}

function installCacheMock() {
  const keys = vi.fn().mockResolvedValue([])
  const deleteCache = vi.fn().mockResolvedValue(true)

  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: { keys, delete: deleteCache },
  })

  return { keys, deleteCache }
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('ServiceWorkerRegistration', () => {
  it('registers the shared worker at root scope in PWA test mode', () => {
    // ARRANGE
    vi.stubEnv('NEXT_PUBLIC_PWA_TEST', '1')
    const serviceWorker = installServiceWorkerMock()
    installCacheMock()

    // ACT
    const view = render(<ServiceWorkerRegistration />)

    // ASSERT
    expect(serviceWorker.register).toHaveBeenCalledTimes(1)
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(serviceWorker.getRegistrations).not.toHaveBeenCalled()
    expect(serviceWorker.addEventListener).toHaveBeenCalledTimes(1)
    expect(serviceWorker.addEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    )

    // AFTER
    view.unmount()
    expect(serviceWorker.removeEventListener).toHaveBeenCalledTimes(1)
    expect(serviceWorker.removeEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    )
  })

  it('checks for stale registrations and caches when registration is disabled', () => {
    // ARRANGE
    vi.stubEnv('NEXT_PUBLIC_PWA_TEST', '0')
    vi.stubEnv('NODE_ENV', 'test')
    const serviceWorker = installServiceWorkerMock()
    const cache = installCacheMock()

    // ACT
    render(<ServiceWorkerRegistration />)

    // ASSERT
    expect(serviceWorker.register).not.toHaveBeenCalled()
    expect(serviceWorker.getRegistrations).toHaveBeenCalledTimes(1)
    expect(cache.keys).toHaveBeenCalledTimes(1)
    expect(cache.deleteCache).not.toHaveBeenCalled()

    // AFTER
  })

  it('removes its online listener when the component unmounts', () => {
    // ARRANGE
    vi.stubEnv('NEXT_PUBLIC_PWA_TEST', '1')
    installServiceWorkerMock()
    installCacheMock()
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    // ACT
    const view = render(<ServiceWorkerRegistration />)
    const onlineHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'online'
    )?.[1]
    view.unmount()

    // ASSERT
    expect(onlineHandler).toEqual(expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('online', onlineHandler)

    // AFTER
  })
})
