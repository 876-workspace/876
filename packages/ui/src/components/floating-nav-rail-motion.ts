/** Physics for the compact floating navigation rail transition. */
export const FLOATING_NAV_RAIL_SPRING = {
  stiffness: 320,
  damping: 24,
  mass: 1,
} as const

/** The transition duration must match the sampled spring window. */
export const FLOATING_NAV_RAIL_SETTLE_MS = 500

const SETTLE_SECONDS = FLOATING_NAV_RAIL_SETTLE_MS / 1000
const SAMPLE_COUNT = 24

function springStep(time: number): number {
  const { stiffness, damping, mass } = FLOATING_NAV_RAIL_SPRING
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
 * Keeping the motion declarative lets CSS interpolate the content-derived
 * height where supported and lets `prefers-reduced-motion` disable the
 * transition without JavaScript measurement or animation loops.
 */
export const FLOATING_NAV_RAIL_EASING = `linear(${Array.from(
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
