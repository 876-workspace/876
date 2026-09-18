'use client'

import { useEffect, useState } from 'react'

/**
 * Measured connectivity, for the offline announcement.
 *
 * `navigator.onLine` answers "is there an interface", not "can we reach the
 * origin": a laptop still associated with a Wi-Fi network whose router lost its
 * uplink reports `true` forever, and a phone whose radio reconnects behind a
 * captive portal does too. So `offline` is trusted (an interface that is down
 * cannot reach anything) while `online` is verified with a cheap same-origin
 * `HEAD` probe on a backoff — the same reasoning as
 * `../lib/offline-recovery-runtime.ts`, which does this for the static
 * fallback document.
 *
 * `HEAD` is deliberate: Serwist registers its routes for `GET`, so a `HEAD`
 * request bypasses every cache and always touches the network.
 */

export interface ConnectivityOptions {
  /** Same-origin URL to probe. Must be cheap and always present. */
  probeUrl?: string
  probeTimeoutMs?: number
  /** Delay before the first re-probe after a failure. */
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}

const DEFAULTS = {
  probeUrl: '/pwa/offline-recovery.js',
  probeTimeoutMs: 5000,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffFactor: 1.5,
} satisfies Required<ConnectivityOptions>

async function reachable(url: string, timeoutMs: number) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const separator = url.includes('?') ? '&' : '?'
    // Any status answers the only question asked — did bytes come back from
    // the origin — so the response itself is never inspected.
    await fetch(`${url}${separator}probe=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @returns `true` while the origin is reachable. Starts optimistic, so a
 * healthy session never flashes an offline bar during hydration.
 */
export function useConnectivity(options: ConnectivityOptions = {}): boolean {
  const {
    probeUrl = DEFAULTS.probeUrl,
    probeTimeoutMs = DEFAULTS.probeTimeoutMs,
    initialDelayMs = DEFAULTS.initialDelayMs,
    maxDelayMs = DEFAULTS.maxDelayMs,
    backoffFactor = DEFAULTS.backoffFactor,
  } = options

  const [online, setOnline] = useState(true)

  useEffect(() => {
    let stopped = false
    let probing = false
    let delay = initialDelayMs
    let timer: ReturnType<typeof setTimeout> | undefined

    function clearTimer() {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
    }

    function schedule(nextDelay: number) {
      if (stopped) return
      clearTimer()
      timer = setTimeout(() => {
        timer = undefined
        void probe()
      }, nextDelay)
    }

    async function probe() {
      if (stopped || probing) return

      probing = true
      try {
        const isReachable = await reachable(probeUrl, probeTimeoutMs)
        if (stopped) return

        setOnline(isReachable)

        if (isReachable) {
          // Nothing to watch while healthy; the browser events below re-arm
          // the loop when something actually changes.
          delay = initialDelayMs
          clearTimer()
          return
        }

        schedule(delay)
        delay = Math.min(Math.round(delay * backoffFactor), maxDelayMs)
      } finally {
        probing = false
      }
    }

    /** A browser hint that connectivity may have changed: check now. */
    function probeNow() {
      delay = initialDelayMs
      clearTimer()
      void probe()
    }

    function handleOffline() {
      // An interface that is down cannot reach the origin, so this needs no
      // confirmation — and confirming it would cost a five-second timeout.
      setOnline(false)
      probeNow()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') probeNow()
    }

    window.addEventListener('online', probeNow)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('pageshow', probeNow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (typeof navigator !== 'undefined' && navigator.onLine === false)
      handleOffline()

    return () => {
      stopped = true
      clearTimer()
      window.removeEventListener('online', probeNow)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('pageshow', probeNow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [probeUrl, probeTimeoutMs, initialDelayMs, maxDelayMs, backoffFactor])

  return online
}
