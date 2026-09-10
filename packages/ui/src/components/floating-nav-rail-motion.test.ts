import { describe, expect, it } from 'vitest'

import {
  FLOATING_NAV_RAIL_EASING,
  FLOATING_NAV_RAIL_SETTLE_MS,
  FLOATING_NAV_RAIL_SPRING,
} from './floating-nav-rail-motion'

function stops(): { progress: number; percentage: number }[] {
  const body = FLOATING_NAV_RAIL_EASING.slice('linear('.length, -1)

  return body.split(', ').map((stop, index, all) => {
    const [progress, percentage] = stop.split(' ')

    return {
      progress: Number(progress),
      percentage:
        percentage === undefined
          ? (index / (all.length - 1)) * 100
          : Number(percentage.replace('%', '')),
    }
  })
}

describe('floating nav rail spring', () => {
  it('exposes the tuned spring parameters', () => {
    expect(FLOATING_NAV_RAIL_SPRING).toEqual({
      stiffness: 320,
      damping: 24,
      mass: 1,
    })
  })

  it('stays underdamped for a controlled overshoot', () => {
    const { stiffness, damping, mass } = FLOATING_NAV_RAIL_SPRING
    const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))

    expect(dampingRatio).toBeLessThan(1)
    expect(dampingRatio).toBeGreaterThan(0.5)
  })

  it('emits a CSS linear easing with sampled stops', () => {
    expect(FLOATING_NAV_RAIL_EASING.startsWith('linear(')).toBe(true)
    expect(FLOATING_NAV_RAIL_EASING.endsWith(')')).toBe(true)
    expect(stops().length).toBeGreaterThan(8)
  })

  it('starts at rest and lands exactly on the target', () => {
    const all = stops()

    expect(all[0]?.progress).toBe(0)
    expect(all.at(-1)?.progress).toBe(1)
    expect(all.at(-1)?.percentage).toBe(100)
  })

  it('overshoots without becoming unstable', () => {
    const peak = Math.max(...stops().map((stop) => stop.progress))

    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.12)
  })

  it('crosses the target before settling', () => {
    const crossings = stops().filter((stop) => stop.progress > 1)

    expect(crossings.length).toBeGreaterThan(0)
  })

  it('advances sampled stops monotonically in time', () => {
    const percentages = stops().map((stop) => stop.percentage)

    expect(percentages).toEqual([...percentages].sort((a, b) => a - b))
  })

  it('publishes the settle duration used by the rail transition', () => {
    expect(FLOATING_NAV_RAIL_SETTLE_MS).toBe(500)
  })
})
