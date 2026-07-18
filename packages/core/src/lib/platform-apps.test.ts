import { describe, expect, it } from 'vitest'

import {
  featureKeyPrefixForAppSlug,
  featurePrefixForAppSlug,
  PLATFORM_APP_SLUGS,
} from './platform-apps'

describe('platform app identities', () => {
  it('keeps first-party runtime slugs and flag prefixes explicit', () => {
    expect(featurePrefixForAppSlug(PLATFORM_APP_SLUGS.consumer)).toBe('app')
    expect(featurePrefixForAppSlug(PLATFORM_APP_SLUGS.billing)).toBe('billing')
    expect(featureKeyPrefixForAppSlug(PLATFORM_APP_SLUGS.couriers)).toBe(
      'couriers_'
    )
  })

  it('derives a stable prefix for a newly registered app', () => {
    expect(featurePrefixForAppSlug('876-market-place')).toBe('market_place')
  })
})
