/**
 * Optional FingerprintJS collector.
 *
 * **Not wired up, and `@fingerprintjs/fingerprintjs` is deliberately not a
 * dependency of this package.** FingerprintJS v4 OSS ships under the Business
 * Source License, and the accuracy that actually matters for fraud comes from
 * the paid Pro service — both decisions the platform has not made yet. This
 * file exists so that when either is adopted, the change is one line at the
 * call site rather than a rewrite of the collection layer.
 *
 * To adopt it:
 *   1. `pnpm --filter @876/device add @fingerprintjs/fingerprintjs`
 *   2. pass `collector: fingerprintjsCollector` to `collectDeviceSignal`
 *      (or thread it through the SDK's client options).
 *
 * @module @876/device/collectors/fingerprintjs
 */

import type { DeviceSignalCollector } from '../index.ts'

type FingerprintAgent = {
  get(): Promise<{
    visitorId: string
    confidence?: { score?: number }
    components?: Record<string, unknown>
  }>
}

type FingerprintModule = {
  load(): Promise<FingerprintAgent>
}

function toConfidence(score: number | undefined): 'low' | 'medium' | 'high' {
  if (score === undefined) return 'medium'
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

/**
 * Resolves to `null` when the optional module is absent, so wiring this in
 * without installing the dependency degrades to the first-party collector
 * rather than throwing.
 */
export const fingerprintjsCollector: DeviceSignalCollector = async () => {
  // Held in a variable so neither TypeScript nor the bundler tries to resolve
  // a package that is intentionally absent from the dependency tree.
  const specifier = '@fingerprintjs/fingerprintjs'

  let module: FingerprintModule
  try {
    module = (await import(/* @vite-ignore */ specifier)) as FingerprintModule
  } catch {
    return null
  }

  try {
    const agent = await module.load()
    const result = await agent.get()

    // Only the digests are kept — raw component values never leave the browser.
    const components: Record<string, string> = {}
    for (const [key, value] of Object.entries(result.components ?? {})) {
      components[`fp_${key}`] = JSON.stringify(value).slice(0, 64)
    }

    return {
      visitorId: result.visitorId,
      confidence: toConfidence(result.confidence?.score),
      components,
    }
  } catch {
    return null
  }
}
