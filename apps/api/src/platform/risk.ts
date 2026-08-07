/**
 * Authentication risk scoring.
 *
 * Pure, deterministic and synchronous: no I/O happens in here. The caller
 * gathers the signals and this module only weighs them, which is what makes
 * the scoring testable rule by rule and keeps a slow query out of the login
 * path.
 *
 * **Nothing here blocks anything.** The score is recorded and shown in
 * Console. `AUTH_RISK_BLOCK_THRESHOLD` defaults to 0, meaning enforcement is
 * off, and it must stay off until the score has been observed against real
 * traffic — a scoring rule that looks sensible can still be wrong often enough
 * to lock real users out of their accounts.
 */

export const MAX_SCORE = 100

export const NEW_DEVICE_POINTS = 15
export const NEW_COUNTRY_POINTS = 20
export const BOT_POINTS = 30
export const UNTRUSTED_CONTEXT_POINTS = 10
export const IDENTIFIER_BURST_POINTS = 20
export const IP_BURST_POINTS = 25
export const SHARED_DEVICE_POINTS = 25
export const IMPOSSIBLE_TRAVEL_POINTS = 35

export const IDENTIFIER_BURST_THRESHOLD = 3
export const IP_BURST_THRESHOLD = 10
export const SHARED_DEVICE_THRESHOLD = 3
export const IMPOSSIBLE_TRAVEL_KMH = 800.0

export const EARTH_RADIUS_KM = 6371.0

/** Signals gathered by the caller before scoring. Every field is optional; missing fields fall back to {@link DEFAULT_RISK_INPUT}. */
export interface RiskInput {
  readonly isNewDevice?: boolean
  readonly isNewCountryForUser?: boolean
  readonly isBot?: boolean
  /** When false, the authentication context is untrusted (e.g. a suspicious browser environment). */
  readonly contextTrusted?: boolean
  readonly recentFailuresForIdentifier?: number
  readonly recentFailuresForIp?: number
  /** Number of distinct users seen on this device; 1 means only the current user. */
  readonly distinctUsersOnDevice?: number
  /** Minutes elapsed since the most recent attempt from a different location, or null when unknown. */
  readonly minutesSinceLastAttemptElsewhere?: number | null
  /** Great-circle distance in km from the previous attempt's location, or null when unknown. */
  readonly kmFromLastAttempt?: number | null
}

/** Weighted outcome of {@link assessRisk}. */
export interface RiskAssessment {
  readonly score: number
  readonly reasons: string[]
}

/** Default values that mirror the Python dataclass field defaults. */
export const DEFAULT_RISK_INPUT: Required<RiskInput> = {
  isNewDevice: false,
  isNewCountryForUser: false,
  isBot: false,
  contextTrusted: true,
  recentFailuresForIdentifier: 0,
  recentFailuresForIp: 0,
  distinctUsersOnDevice: 1,
  minutesSinceLastAttemptElsewhere: null,
  kmFromLastAttempt: null,
}

/**
 * Great-circle distance in kilometres between two latitude/longitude points.
 *
 * Uses the haversine formula, which is accurate to within 0.5 % for distances
 * below 10 000 km and adequate for the impossible-travel heuristic.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dPhi = ((lat2 - lat1) * Math.PI) / 180
  const dLambda = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/**
 * Distance between two stored coordinate pairs, or `null` if any coordinate is
 * missing or malformed.
 *
 * Coordinates are stored as strings to preserve precision, so this is where
 * they are parsed — and a malformed pair yields `null` rather than throwing,
 * because a geo lookup that returned junk must not fail a login.
 */
export function distanceBetween(
  lat1: string | null | undefined,
  lon1: string | null | undefined,
  lat2: string | null | undefined,
  lon2: string | null | undefined
): number | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null

  const parsed = [lat1, lon1, lat2, lon2].map(parseCoordinate)
  const [n1, n2, n3, n4] = parsed as [
    number | null,
    number | null,
    number | null,
    number | null,
  ]
  if (n1 === null || n2 === null || n3 === null || n4 === null) return null

  return haversineKm(n1, n2, n3, n4)
}

/**
 * Parse one stored coordinate, or `null` when it is not a finite number.
 *
 * `Number()` is deliberately not used bare: it maps a whitespace-only string to
 * `0`, where Python's `float()` raises and the caller returns `None`. Treating
 * `"   "` as the equator would be a silent divergence between the two services.
 */
function parseCoordinate(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Speed implied by two consecutive attempts, or `null` when undefined.
 *
 * Zero elapsed minutes with real distance is treated as infinite speed rather
 * than a division error: two attempts from different continents in the same
 * minute is the clearest possible signal, not an edge case to discard.
 */
export function impliedSpeedKmh(
  km: number | null,
  minutes: number | null
): number | null {
  if (km === null || minutes === null || km <= 0) return null
  if (minutes <= 0) return Number.POSITIVE_INFINITY
  return km / (minutes / 60)
}

/**
 * Weighs the gathered signals. Deterministic, and clamped to 0–100.
 *
 * Reason strings are a contract: they are written to `auth_attempts` and
 * rendered in Console. Their order is fixed.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const signal: Required<RiskInput> = { ...DEFAULT_RISK_INPUT, ...input }

  let score = 0
  const reasons: string[] = []

  if (signal.isNewDevice) {
    score += NEW_DEVICE_POINTS
    reasons.push('new_device')
  }

  if (signal.isNewCountryForUser) {
    score += NEW_COUNTRY_POINTS
    reasons.push('new_country')
  }

  if (signal.isBot) {
    score += BOT_POINTS
    reasons.push('bot_user_agent')
  }

  if (!signal.contextTrusted) {
    score += UNTRUSTED_CONTEXT_POINTS
    reasons.push('untrusted_context')
  }

  if (signal.recentFailuresForIdentifier >= IDENTIFIER_BURST_THRESHOLD) {
    score += IDENTIFIER_BURST_POINTS
    reasons.push('identifier_failure_burst')
  }

  if (signal.recentFailuresForIp >= IP_BURST_THRESHOLD) {
    score += IP_BURST_POINTS
    reasons.push('ip_failure_burst')
  }

  if (signal.distinctUsersOnDevice >= SHARED_DEVICE_THRESHOLD) {
    score += SHARED_DEVICE_POINTS
    reasons.push('shared_device')
  }

  const speed = impliedSpeedKmh(
    signal.kmFromLastAttempt,
    signal.minutesSinceLastAttemptElsewhere
  )
  if (speed !== null && speed > IMPOSSIBLE_TRAVEL_KMH) {
    score += IMPOSSIBLE_TRAVEL_POINTS
    reasons.push('impossible_travel')
  }

  return { score: Math.min(score, MAX_SCORE), reasons }
}

/**
 * Whether a score blocks, given the configured threshold.
 *
 * A threshold of 0 — the default and the only supported production value
 * today — never blocks, whatever the score. Enabling enforcement is a config
 * change, not a code change, which is the whole point of routing it through
 * this single guard.
 */
export function shouldBlock(score: number, threshold: number): boolean {
  // A non-positive threshold means enforcement is disabled; never block.
  if (threshold <= 0) return false
  return score >= threshold
}
