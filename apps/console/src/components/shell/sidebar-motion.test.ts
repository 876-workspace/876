import { describe, expect, it } from 'vitest'

import {
  SIDEBAR_SPRING,
  SIDEBAR_SPRING_RAIL,
  SIDEBAR_SPRING_SETTLE_MS,
} from '@/components/shell/sidebar-motion'

/** `linear(0, 0.42 4.17%, …, 1 100%)` → the numeric progress of each stop. */
function stops(): { progress: number; percentage: number }[] {
  const body = SIDEBAR_SPRING_RAIL.slice('linear('.length, -1)

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

describe('sidebar spring', () => {
  it('exposes the spring as tunable named parameters', () => {
    expect(SIDEBAR_SPRING).toEqual({ stiffness: 320, damping: 24, mass: 1 })
  })

  it('is underdamped, which is what makes the rail bounce rather than ease', () => {
    const { stiffness, damping, mass } = SIDEBAR_SPRING
    const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))

    expect(dampingRatio).toBeLessThan(1)
    expect(dampingRatio).toBeGreaterThan(0.5)
  })

  it('emits a CSS linear() easing', () => {
    expect(SIDEBAR_SPRING_RAIL.startsWith('linear(')).toBe(true)
    expect(SIDEBAR_SPRING_RAIL.endsWith(')')).toBe(true)
    expect(stops().length).toBeGreaterThan(8)
  })

  it('starts at rest and lands exactly on the target', () => {
    const all = stops()

    expect(all[0]?.progress).toBe(0)
    expect(all.at(-1)?.progress).toBe(1)
    expect(all.at(-1)?.percentage).toBe(100)
  })

  it('overshoots the target before settling', () => {
    const peak = Math.max(...stops().map((stop) => stop.progress))

    expect(peak).toBeGreaterThan(1)
    // Sprung, not unstable: a rail that bounces 20% past its height is hard to
    // click into while it is still moving.
    expect(peak).toBeLessThan(1.12)
  })

  it('crosses the target rather than approaching it from below', () => {
    const crossings = stops().filter((stop) => stop.progress > 1)

    expect(crossings.length).toBeGreaterThan(0)
  })

  it('advances its stops monotonically in time', () => {
    const percentages = stops().map((stop) => stop.percentage)

    expect(percentages).toEqual([...percentages].sort((a, b) => a - b))
  })

  it('publishes the settle window the transition duration must match', () => {
    expect(SIDEBAR_SPRING_SETTLE_MS).toBe(500)
  })
})
