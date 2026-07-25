import { describe, expect, it } from 'vitest'

import {
  FEATURE_GROUPS,
  findFeatureGroupByMasterSlug,
  isFeatureGroupChild,
} from './feature-groups'

describe('feature groups', () => {
  it('uses unique master slugs for each feature group', () => {
    const masters = FEATURE_GROUPS.map((group) => group.masterSlug)
    expect(new Set(masters).size).toBe(masters.length)
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
