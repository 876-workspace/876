import { describe, expect, it } from 'vitest'

import { currentDayWindow } from './work-widget'

describe('currentDayWindow', () => {
  it('covers the complete local day with an exclusive end', () => {
    const now = new Date(2026, 8, 9, 12)
    const start = new Date(2026, 8, 9)
    const end = new Date(2026, 8, 10)

    expect(currentDayWindow(now)).toEqual({
      from: Math.floor(start.getTime() / 1000),
      to: Math.floor(end.getTime() / 1000),
    })
  })
})
