import { describe, expect, it, vi } from 'vitest'

vi.mock('@/db/client', () => ({ prisma: {} }))
vi.mock('@/providers/posthog/client', () => ({
  getPostHogClient: vi.fn(),
  PostHogClient: vi.fn(),
}))

import {
  FEATURE_SEEDS_BY_APP,
  PLATFORM_FEATURE_SEEDS,
  validateFeatureSeeds,
} from './features'

function seedFor(appSlug: string, featureSlug: string) {
  return FEATURE_SEEDS_BY_APP[appSlug]?.find(
    (seed) => seed.slug === featureSlug
  )
}

describe('feature seed catalog', () => {
  it('keeps every app and platform catalog structurally valid', () => {
    validateFeatureSeeds(null, PLATFORM_FEATURE_SEEDS)
    for (const [appSlug, seeds] of Object.entries(FEATURE_SEEDS_BY_APP)) {
      validateFeatureSeeds(appSlug, seeds)
    }
  })

  it('seeds Estimates as a disabled child of Billing Sales', () => {
    expect(seedFor('876-billing', 'billing_sales_estimates')).toMatchObject({
      parentSlug: 'billing_sales',
      defaultEnabled: false,
    })
  })

  it.each([
    ['console', 'console_widgets_chat', 'console_widgets', 'console_chat'],
    ['876-billing', 'billing_widgets_chat', 'billing_widgets', 'billing_chat'],
    [
      '876-couriers',
      'couriers_widgets_chat',
      'couriers_widgets',
      'couriers_chat',
    ],
  ])(
    'migrates %s Chat into the app widget hierarchy without removing its legacy flag',
    (appSlug, widgetSlug, parentSlug, legacySlug) => {
      expect(seedFor(appSlug, widgetSlug)).toMatchObject({
        parentSlug,
        tags: ['widget'],
        copyStateFromSlug: legacySlug,
      })
      expect(seedFor(appSlug, legacySlug)).toBeDefined()
    }
  )

  it('adds a platform Chat gate above every app-specific Chat gate', () => {
    expect(
      PLATFORM_FEATURE_SEEDS.find(
        (seed) => seed.slug === 'platform_widgets_chat'
      )
    ).toMatchObject({
      parentSlug: 'platform_widgets',
      tags: ['widget'],
    })
  })
})
