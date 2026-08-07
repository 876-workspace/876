/**
 * Tests for `../risk.ts`. Every expected value was produced by executing
 * `core/risk.py` directly — they are the oracle, not a guess.
 */

import { describe, expect, it } from 'vitest'

import {
  assessRisk,
  distanceBetween,
  haversineKm,
  impliedSpeedKmh,
  shouldBlock,
  type RiskAssessment,
} from '../risk'

// ---------------------------------------------------------------------------
// haversineKm
// ---------------------------------------------------------------------------

describe('haversineKm', () => {
  it('computes Kingston → Heathrow to 4 decimal places', () => {
    // 18.0179°N 76.8099°W → 51.4700°N 0.4543°W
    expect(haversineKm(18.0179, -76.8099, 51.47, -0.4543)).toBeCloseTo(
      7512.37168,
      4
    )
  })
})

// ---------------------------------------------------------------------------
// distanceBetween
// ---------------------------------------------------------------------------

describe('distanceBetween', () => {
  it('returns the same distance as haversineKm for valid string coordinates', () => {
    expect(
      distanceBetween('18.0179', '-76.8099', '51.4700', '-0.4543')
    ).toBeCloseTo(7512.37168, 4)
  })

  it('returns null when any coordinate is null', () => {
    expect(distanceBetween('18.0', null, '51.4', '-0.45')).toBeNull()
  })

  it('returns null for a malformed coordinate — never throws', () => {
    expect(distanceBetween('abc', '-76.8', '51.4', '-0.45')).toBeNull()
  })

  it('returns null for an empty string coordinate', () => {
    expect(distanceBetween('', '-76.8099', '51.4700', '-0.4543')).toBeNull()
    expect(distanceBetween('18.0179', '', '51.4700', '-0.4543')).toBeNull()
    expect(distanceBetween('18.0179', '-76.8099', '', '-0.4543')).toBeNull()
    expect(distanceBetween('18.0179', '-76.8099', '51.4700', '')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// impliedSpeedKmh
// ---------------------------------------------------------------------------

describe('impliedSpeedKmh', () => {
  it.each<[number | null, number | null, number | null]>([
    [null, 5, null],
    [100, null, null],
    [0, 5, null],
    [-5, 5, null],
    [100, 60, 100],
  ])('impliedSpeedKmh(%s, %s) → %s', (km, minutes, expected) => {
    expect(impliedSpeedKmh(km, minutes)).toBe(expected)
  })

  it('returns Infinity for zero elapsed minutes with real distance', () => {
    expect(impliedSpeedKmh(100, 0)).toBe(Infinity)
  })

  it('returns Infinity for negative elapsed minutes with real distance', () => {
    expect(impliedSpeedKmh(100, -1)).toBe(Infinity)
  })
})

// ---------------------------------------------------------------------------
// assessRisk
// ---------------------------------------------------------------------------

describe('assessRisk', () => {
  it('scores all defaults at 0 with no reasons', () => {
    expect(assessRisk({})).toEqual<RiskAssessment>({ score: 0, reasons: [] })
  })

  it('scores a new device at 15', () => {
    expect(assessRisk({ isNewDevice: true })).toEqual<RiskAssessment>({
      score: 15,
      reasons: ['new_device'],
    })
  })

  it('scores new device + new country at 35', () => {
    expect(
      assessRisk({ isNewDevice: true, isNewCountryForUser: true })
    ).toEqual<RiskAssessment>({
      score: 35,
      reasons: ['new_device', 'new_country'],
    })
  })

  it('scores a bot at 30', () => {
    expect(assessRisk({ isBot: true })).toEqual<RiskAssessment>({
      score: 30,
      reasons: ['bot_user_agent'],
    })
  })

  it('scores an untrusted context at 10', () => {
    expect(assessRisk({ contextTrusted: false })).toEqual<RiskAssessment>({
      score: 10,
      reasons: ['untrusted_context'],
    })
  })

  it('scores identifier failure burst at threshold (3) as 20', () => {
    expect(
      assessRisk({ recentFailuresForIdentifier: 3 })
    ).toEqual<RiskAssessment>({
      score: 20,
      reasons: ['identifier_failure_burst'],
    })
  })

  it('does not score identifier failures below threshold (2)', () => {
    expect(
      assessRisk({ recentFailuresForIdentifier: 2 })
    ).toEqual<RiskAssessment>({
      score: 0,
      reasons: [],
    })
  })

  it('scores IP failure burst at threshold (10) as 25', () => {
    expect(assessRisk({ recentFailuresForIp: 10 })).toEqual<RiskAssessment>({
      score: 25,
      reasons: ['ip_failure_burst'],
    })
  })

  it('scores a shared device at threshold (3) as 25', () => {
    expect(assessRisk({ distinctUsersOnDevice: 3 })).toEqual<RiskAssessment>({
      score: 25,
      reasons: ['shared_device'],
    })
  })

  it('scores impossible travel (5000 km in 60 min) at 35', () => {
    expect(
      assessRisk({
        kmFromLastAttempt: 5000,
        minutesSinceLastAttemptElsewhere: 60,
      })
    ).toEqual<RiskAssessment>({ score: 35, reasons: ['impossible_travel'] })
  })

  it('scores impossible travel (5000 km in 0 min — infinite speed) at 35', () => {
    expect(
      assessRisk({
        kmFromLastAttempt: 5000,
        minutesSinceLastAttemptElsewhere: 0,
      })
    ).toEqual<RiskAssessment>({ score: 35, reasons: ['impossible_travel'] })
  })

  it('does not score plausible travel (100 km in 60 min)', () => {
    expect(
      assessRisk({
        kmFromLastAttempt: 100,
        minutesSinceLastAttemptElsewhere: 60,
      })
    ).toEqual<RiskAssessment>({ score: 0, reasons: [] })
  })

  it('clamps every signal at once to 100 with all eight reasons in order', () => {
    expect(
      assessRisk({
        isNewDevice: true,
        isNewCountryForUser: true,
        isBot: true,
        contextTrusted: false,
        recentFailuresForIdentifier: 99,
        recentFailuresForIp: 99,
        distinctUsersOnDevice: 99,
        minutesSinceLastAttemptElsewhere: 0,
        kmFromLastAttempt: 20000,
      })
    ).toEqual<RiskAssessment>({
      score: 100,
      reasons: [
        'new_device',
        'new_country',
        'bot_user_agent',
        'untrusted_context',
        'identifier_failure_burst',
        'ip_failure_burst',
        'shared_device',
        'impossible_travel',
      ],
    })
  })

  it('a caller supplying only { isBot: true } scores exactly 30', () => {
    expect(assessRisk({ isBot: true })).toEqual<RiskAssessment>({
      score: 30,
      reasons: ['bot_user_agent'],
    })
  })
})

// ---------------------------------------------------------------------------
// shouldBlock
// ---------------------------------------------------------------------------

describe('shouldBlock', () => {
  it.each<[number, number, boolean]>([
    [0, 0, false],
    [100, 0, false],
    [50, 60, false],
    [60, 60, true],
    [61, 60, true],
    [100, -1, false],
  ])('shouldBlock(%s, %s) → %s', (score, threshold, expected) => {
    expect(shouldBlock(score, threshold)).toBe(expected)
  })

  it('a threshold of 0 never blocks, whatever the score', () => {
    // A threshold of 0 — the default and the only supported production value
    // today — never blocks whatever the score. Enabling enforcement is a config
    // change, not a code change.
    expect(shouldBlock(100, 0)).toBe(false)
    expect(shouldBlock(0, 0)).toBe(false)
    expect(shouldBlock(99, 0)).toBe(false)
  })
})
