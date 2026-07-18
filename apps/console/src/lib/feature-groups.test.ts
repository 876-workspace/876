import { describe, expect, it } from 'vitest'

import {
  FEATURE_GROUPS,
  findFeatureGroupByMasterSlug,
  isFeatureGroupChild,
  PINNED_ROOT_FEATURE_SLUGS,
} from './feature-groups'

describe('feature groups', () => {
  it('keeps pinned roots synchronized with the configured group masters', () => {
    expect(PINNED_ROOT_FEATURE_SLUGS).toEqual(
      FEATURE_GROUPS.map((group) => group.masterSlug)
    )
  })

  it('returns the matching group for a master slug', () => {
    const result = findFeatureGroupByMasterSlug('console_notifications')

    expect(result).toEqual(FEATURE_GROUPS[0])
  })

  it.each(['', 'console_notifications_slack', 'unknown', '__proto__'])(
    'returns null when %s is not a master slug',
    (slug) => {
      expect(findFeatureGroupByMasterSlug(slug)).toBeNull()
    }
  )

  it('accepts a configured child slug', () => {
    const result = isFeatureGroupChild(
      FEATURE_GROUPS[0],
      'console_notifications_slack'
    )

    expect(result).toBe(true)
  })

  it('accepts a prefixed child before it is added to the local item list', () => {
    const result = isFeatureGroupChild(
      FEATURE_GROUPS[0],
      'console_notifications_future'
    )

    expect(result).toBe(true)
  })

  it.each(['console_notifications', 'console_widgets_notepad', '', 'widgets'])(
    'rejects non-child slug %s',
    (slug) => {
      expect(isFeatureGroupChild(FEATURE_GROUPS[0], slug)).toBe(false)
    }
  )
})
