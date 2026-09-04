/**
 * The rail's spring, as physics rather than as four bezier control points.
 *
 * An ease curve decelerates into its target; a spring overshoots and settles,
 * which is the movement being asked for. These three numbers are the whole
 * character of it — raise `stiffness` for a faster snap, lower `damping` for
 * more bounce — so amplitude is tuned here, by eye, without touching a
 * component.
 *
 * At 320/24/1 the damping ratio is ~0.67 and the rail overshoots by ~6%: enough
 * to read as sprung, not enough to look unstable while an operator is trying to
 * click something.
 */
export const SIDEBAR_SPRING = {
  stiffness: 320,
  damping: 24,
  mass: 1,
} as const

/**
 * How long the spring is allowed to settle. `Sidebar`'s transition duration
 * must match it: the generated stops describe this whole window, so a shorter
 * transition truncates the settle and a longer one stretches the overshoot.
 */
export const SIDEBAR_SPRING_SETTLE_MS = 500

const SETTLE_SECONDS = SIDEBAR_SPRING_SETTLE_MS / 1000
const SAMPLE_COUNT = 24

function springStep(time: number): number {
  const { stiffness, damping, mass } = SIDEBAR_SPRING
  const naturalFrequency = Math.sqrt(stiffness / mass)
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))

  if (dampingRatio >= 1) {
    const root = Math.sqrt(dampingRatio ** 2 - 1)
    const s1 = -naturalFrequency * (dampingRatio - root)
    const s2 = -naturalFrequency * (dampingRatio + root)
    const a = s2 / (s2 - s1)
    const b = -s1 / (s2 - s1)
    return 1 - a * Math.exp(s1 * time) - b * Math.exp(s2 * time)
  }

  const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio ** 2)
  const envelope = Math.exp(-dampingRatio * naturalFrequency * time)
  const sineScale = dampingRatio / Math.sqrt(1 - dampingRatio ** 2)

  return (
    1 -
    envelope *
      (Math.cos(dampedFrequency * time) +
        sineScale * Math.sin(dampedFrequency * time))
  )
}

function formatStop(value: number, percentage: number): string {
  return `${Number(value.toFixed(4))} ${Number(percentage.toFixed(2))}%`
}

/**
 * CSS `linear()` stops sampled from the spring above.
 *
 * `linear()` is what lets a spring drive a *height* transition: the height is
 * content-derived (`interpolate-size: allow-keywords`), so it cannot be driven
 * by a JS animation loop without first measuring it, and a declarative timing
 * function keeps `prefers-reduced-motion` handling in CSS where it belongs.
 *
 * The endpoints are pinned to exactly 0 and 1 rather than sampled. A spring has
 * not fully settled at any finite time, and a final stop of 0.9969 would leave
 * the rail 0.3% short of its real height and then snap.
 */
export const SIDEBAR_SPRING_RAIL = `linear(${Array.from(
  { length: SAMPLE_COUNT + 1 },
  (_, index) => {
    if (index === 0) return '0'
    if (index === SAMPLE_COUNT) return '1 100%'

    return formatStop(
      springStep((index / SAMPLE_COUNT) * SETTLE_SECONDS),
      (index / SAMPLE_COUNT) * 100
    )
  }
).join(', ')})`
