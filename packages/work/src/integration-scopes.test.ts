import { describe, expect, it } from 'vitest'

import {
  isWorkIntegrationScope,
  WORK_INTEGRATION_SCOPES,
} from './integration-scopes'

describe('Work integration scopes', () => {
  it('exposes only task and reminder read/write scopes', () => {
    expect(WORK_INTEGRATION_SCOPES).toEqual([
      'work.tasks.read',
      'work.tasks.write',
      'work.reminders.read',
      'work.reminders.write',
    ])
    expect(isWorkIntegrationScope('work.events.read')).toBe(false)
  })
})
