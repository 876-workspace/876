/**
 * Recovery loop for a service worker's static offline fallback.
 *
 * The `online` event alone is not enough to bring an offline screen back. It
 * only reports that the device has *an* interface: a laptop that never left the
 * Wi-Fi network while the router lost its uplink never fires it, and neither
 * does a phone whose radio reconnects before the captive portal lets traffic
 * through. Waiting for that event is why the fallback used to be a dead end —
 * the browser regained the internet and the page stayed put.
 *
 * So connectivity is *measured* instead: a cheap same-origin `HEAD` probe on a
 * backoff, re-armed whenever the browser gives us a reason to think something
 * changed (`online`, tab becoming visible, bfcache restore). Any HTTP response
 * — including a 404 — proves the network is reachable; only a rejected or timed
 * out fetch counts as offline.
 *
 * `HEAD` is deliberate: Serwist registers its routes for `GET`, so a `HEAD`
 * request bypasses the worker's caches entirely and always hits the network.
 */

export interface OfflineRecoveryOptions {
  /** Same-origin URL to probe. Must be cheap and always present. */
  probeUrl?: string
  /** How long a probe may take before it counts as offline. */
  probeTimeoutMs?: number
  /** Delay before the first scheduled retry. */
  initialDelayMs?: number
  /** Upper bound for the backoff. */
  maxDelayMs?: number
  /** Growth factor applied to the delay after each failed probe. */
  backoffFactor?: number
}

const DEFAULTS = {
  probeUrl: '/pwa/offline-recovery.js',
  probeTimeoutMs: 5000,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffFactor: 1.5,
} satisfies Required<OfflineRecoveryOptions>

/**
 * Starts watching for connectivity and reloads the page once it returns.
 *
 * @returns A function that stops the loop. Exposed for tests; the shipped
 * script never calls it, because the reload is what ends the page's life.
 */
export function startOfflineRecovery(
  options: OfflineRecoveryOptions = {}
): () => void {
  const config = { ...DEFAULTS, ...options }

  const retry = document.querySelector<HTMLButtonElement>(
    '[data-offline-retry]'
  )

  let stopped = false
  let recovering = false
  let probing = false
  let delay = config.initialDelayMs
  let timer: ReturnType<typeof setTimeout> | undefined

  function recover() {
    if (recovering) return

    recovering = true
    stopped = true
    clearTimer()

    if (retry) {
      retry.disabled = true
      retry.textContent = 'Reconnecting...'
    }

    window.location.reload()
  }

  function clearTimer() {
    if (timer === undefined) return

    clearTimeout(timer)
    timer = undefined
  }

  function scheduleNextProbe() {
    if (stopped) return

    clearTimer()
    timer = setTimeout(() => {
      timer = undefined
      void probe()
    }, delay)

    delay = Math.min(
      Math.round(delay * config.backoffFactor),
      config.maxDelayMs
    )
  }

  async function reachable() {
    if (navigator.onLine === false) return false

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.probeTimeoutMs)

    try {
      const separator = config.probeUrl.includes('?') ? '&' : '?'
      // Any status answers the only question being asked — did bytes come back
      // from the origin — so the response is never inspected.
      await fetch(`${config.probeUrl}${separator}probe=${Date.now()}`, {
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

  async function probe() {
    if (stopped || probing) return

    probing = true
    try {
      if (await reachable()) recover()
      else scheduleNextProbe()
    } finally {
      probing = false
    }
  }

  /** A browser hint that connectivity may have changed: check now, not later. */
  function probeNow() {
    if (stopped) return

    delay = config.initialDelayMs
    clearTimer()
    void probe()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') probeNow()
  }

  retry?.addEventListener('click', recover)
  window.addEventListener('online', probeNow)
  window.addEventListener('pageshow', probeNow)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  void probe()

  return () => {
    stopped = true
    clearTimer()
    retry?.removeEventListener('click', recover)
    window.removeEventListener('online', probeNow)
    window.removeEventListener('pageshow', probeNow)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
