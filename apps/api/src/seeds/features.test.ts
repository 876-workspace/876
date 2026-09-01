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

const CANONICAL = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('feature seed catalog', () => {
  it('keeps every app and platform catalog structurally valid', () => {
    validateFeatureSeeds(null, PLATFORM_FEATURE_SEEDS)
    for (const [appSlug, seeds] of Object.entries(FEATURE_SEEDS_BY_APP)) {
      validateFeatureSeeds(appSlug, seeds)
    }
  })

  it('publishes only canonical kebab-case feature slugs', () => {
    const seeds = [
      ...PLATFORM_FEATURE_SEEDS,
      ...Object.values(FEATURE_SEEDS_BY_APP).flat(),
    ]
    expect(seeds.every((seed) => CANONICAL.test(seed.slug))).toBe(true)
    expect(seeds.some((seed) => seed.slug.includes('_'))).toBe(false)
  })

  it('keeps explicit legacy aliases for every renamed seed', () => {
    const seeds = [
      ...PLATFORM_FEATURE_SEEDS,
      ...Object.values(FEATURE_SEEDS_BY_APP).flat(),
    ]
    expect(seeds.every((seed) => (seed.legacySlugs?.length ?? 0) > 0)).toBe(
      true
    )
  })

  it('seeds Estimates as a disabled child of Billing Sales', () => {
    expect(seedFor('876-billing', 'billing-sales-estimates')).toMatchObject({
      parentSlug: 'billing-sales',
      defaultEnabled: false,
      legacySlugs: ['billing_sales_estimates'],
    })
  })

  it.each([
    ['console', 'console-widgets-chat', 'console-widgets', 'console-chat'],
    ['876-billing', 'billing-widgets-chat', 'billing-widgets', 'billing-chat'],
    [
      '876-couriers',
      'couriers-widgets-chat',
      'couriers-widgets',
      'couriers-chat',
    ],
  ])(
    'copies %s Chat state through canonical feature slugs',
    (appSlug, widgetSlug, parentSlug, sourceSlug) => {
      expect(seedFor(appSlug, widgetSlug)).toMatchObject({
        parentSlug,
        tags: ['widget'],
        copyStateFromSlug: sourceSlug,
      })
      expect(seedFor(appSlug, sourceSlug)).toBeDefined()
    }
  )

  it('adds a platform Chat gate above every app-specific Chat gate', () => {
    expect(
      PLATFORM_FEATURE_SEEDS.find(
        (seed) => seed.slug === 'platform-widgets-chat'
      )
    ).toMatchObject({
      parentSlug: 'platform-widgets',
      tags: ['widget'],
      legacySlugs: ['platform_widgets_chat'],
    })
  })

  it('rejects underscore canonical slugs', () => {
    expect(() =>
      validateFeatureSeeds('console', [
        {
          slug: 'console_bad-key',
          name: 'Bad',
          description: 'Bad key',
        },
      ])
    ).toThrow('must be kebab-case')
  })

  it('rejects a child that does not extend its canonical parent key', () => {
    expect(() =>
      validateFeatureSeeds('console', [
        {
          slug: 'console-widgets',
          name: 'Widgets',
          description: 'Group',
        },
        {
          slug: 'console-notepad',
          name: 'Notepad',
          description: 'Bad child',
          parentSlug: 'console-widgets',
        },
      ])
    ).toThrow('must extend parent key')
  })
})
