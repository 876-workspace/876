import { describe, expect, it } from 'vitest'

import {
  curatedReportTimezones,
  supportedReportTimezones,
} from './report-timezones'

describe('curatedReportTimezones', () => {
  it('keeps the curated selection to supported zones', () => {
    const zones = curatedReportTimezones(
      ['America/Jamaica', 'Europe/London', 'Mars/Olympus'],
      'America/Jamaica'
    )
    expect(zones).toContain('America/Jamaica')
    expect(zones).toContain('Europe/London')
    expect(zones).not.toContain('Mars/Olympus')
  })

  it('preserves a stored zone outside the curated set', () => {
    const zones = curatedReportTimezones(
      ['America/Jamaica', 'Pacific/Kiritimati'],
      'Pacific/Kiritimati'
    )
    expect(zones).toContain('Pacific/Kiritimati')
  })

  it('omits an unsupported stored zone', () => {
    const zones = curatedReportTimezones(['America/Jamaica'], 'Mars/Olympus')
    expect(zones).not.toContain('Mars/Olympus')
  })
})

describe('supportedReportTimezones', () => {
  it('returns a non-empty list containing Jamaica', () => {
    const zones = supportedReportTimezones()
    expect(zones.length).toBeGreaterThan(0)
    expect(zones).toContain('America/Jamaica')
  })
})
