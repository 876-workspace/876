import { describe, expect, it } from 'vitest'

import {
  isWorkIntegrationScope,
  WORK_CRM_INTEGRATION_SCOPES,
  WORK_INTEGRATION_SCOPES,
} from './integration-scopes'

describe('Work integration scopes', () => {
  it('publishes the Phase 2 productivity-plane scope vocabulary', () => {
    expect(WORK_INTEGRATION_SCOPES).toEqual([
      'work.tasks.read',
      'work.tasks.write',
      'work.reminders.read',
      'work.reminders.write',
      'work.calendars.read',
      'work.calendars.write',
      'work.events.read',
      'work.events.write',
      'work.alerts.read',
      'work.alerts.write',
      'work.my-work.read',
      'work.sync.read',
      'work.sync.write',
    ])
  })

  it('recognizes a published scope and rejects an unknown one', () => {
    expect(isWorkIntegrationScope('work.events.read')).toBe(true)
    expect(isWorkIntegrationScope('work.everything')).toBe(false)
  })

  it("keeps CRM's grant a strict subset of the published vocabulary", () => {
    const published = new Set<string>(WORK_INTEGRATION_SCOPES)
    for (const scope of WORK_CRM_INTEGRATION_SCOPES)
      expect(published.has(scope)).toBe(true)

    expect(WORK_CRM_INTEGRATION_SCOPES.length).toBeLessThan(
      WORK_INTEGRATION_SCOPES.length
    )
  })

  it('does not grant CRM the provider synchronization scopes', () => {
    const granted = new Set<string>(WORK_CRM_INTEGRATION_SCOPES)
    expect(granted.has('work.sync.read')).toBe(false)
    expect(granted.has('work.sync.write')).toBe(false)
  })
})
