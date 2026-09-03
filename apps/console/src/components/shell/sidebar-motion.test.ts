import { describe, expect, it } from 'vitest'

import { SIDEBAR_SPRING, SIDEBAR_SPRING_RAIL } from '@/components/shell/sidebar-motion'

describe('sidebar spring', () => {
  it('exposes named spring parameters for visual tuning', () => {
    expect(SIDEBAR_SPRING).toEqual({
      stiffness: 320,
      damping: 24,
      mass: 1,
    })
  })

  it('generates a CSS linear easing with a restrained overshoot and settle', () => {
    expect(SIDEBAR_SPRING_RAIL.startsWith('linear(')).toBe(true)
    expect(SIDEBAR_SPRING_RAIL.endsWith(')')).toBe(true)
    expect(SIDEBAR_SPRING_RAIL).toContain('1.0577')
    expect(SIDEBAR_SPRING_RAIL).toContain('0.9969 100%')
  })
})
