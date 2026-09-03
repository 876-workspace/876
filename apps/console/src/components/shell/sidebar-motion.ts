export const SIDEBAR_SPRING = {
  stiffness: 320,
  damping: 24,
  mass: 1,
} as const

const SETTLE_SECONDS = 0.5
const SAMPLE_COUNT = 24

function springStep(time: number): number {
  const { stiffness, damping, mass } = SIDEBAR_SPRING
  const naturalFrequency = Math.sqrt(stiffness / mass)
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))

  if (dampingRatio >= 1) {
    const r = naturalFrequency * Math.sqrt(dampingRatio ** 2 - 1)
    const s1 = -naturalFrequency * (dampingRatio - Math.sqrt(dampingRatio ** 2 - 1))
    const s2 = -naturalFrequency * (dampingRatio + Math.sqrt(dampingRatio ** 2 - 1))
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
  return `${Number(value.toFixed(4))} ${percentage}%`
}

/** CSS `linear()` stops generated from the named spring parameters above. */
export const SIDEBAR_SPRING_RAIL = `linear(${Array.from(
  { length: SAMPLE_COUNT + 1 },
  (_, index) =>
    index === 0
      ? '0'
      : formatStop(
          springStep((index / SAMPLE_COUNT) * SETTLE_SECONDS),
          (index / SAMPLE_COUNT) * 100
        )
).join(', ')})`
