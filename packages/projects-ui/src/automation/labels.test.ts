import { describe, expect, it } from 'vitest'

import {
  ACTION_LABELS,
  RUN_STATUS_LABELS,
  TRIGGER_LABELS,
  actionLabel,
  triggerLabel,
} from './labels'

describe('TRIGGER_LABELS', () => {
  it('labels work-item.created', () => {
    expect(TRIGGER_LABELS['work-item.created']).toBe('Work item created')
  })

  it('labels work-item.updated', () => {
    expect(TRIGGER_LABELS['work-item.updated']).toBe('Work item updated')
  })

  it('labels work-item.state-changed', () => {
    expect(TRIGGER_LABELS['work-item.state-changed']).toBe(
      'Work item state changed'
    )
  })

  it('labels phase.completed', () => {
    expect(TRIGGER_LABELS['phase.completed']).toBe('Phase completed')
  })

  it('labels due-date.approaching', () => {
    expect(TRIGGER_LABELS['due-date.approaching']).toBe('Due date approaching')
  })

  it('labels time-entry.submitted', () => {
    expect(TRIGGER_LABELS['time-entry.submitted']).toBe('Time entry submitted')
  })

  it('labels budget.threshold-reached', () => {
    expect(TRIGGER_LABELS['budget.threshold-reached']).toBe(
      'Budget threshold reached'
    )
  })
})

describe('ACTION_LABELS', () => {
  it('labels set-field', () => {
    expect(ACTION_LABELS['set-field']).toBe('Set field')
  })

  it('labels assign', () => {
    expect(ACTION_LABELS.assign).toBe('Assign')
  })

  it('labels add-label', () => {
    expect(ACTION_LABELS['add-label']).toBe('Add label')
  })

  it('labels remove-label', () => {
    expect(ACTION_LABELS['remove-label']).toBe('Remove label')
  })

  it('labels create-reminder', () => {
    expect(ACTION_LABELS['create-reminder']).toBe('Create reminder')
  })

  it('labels create-event', () => {
    expect(ACTION_LABELS['create-event']).toBe('Create event')
  })

  it('labels notify', () => {
    expect(ACTION_LABELS.notify).toBe('Notify')
  })

  it('labels call-webhook', () => {
    expect(ACTION_LABELS['call-webhook']).toBe('Call webhook')
  })

  it('labels create-sub-item', () => {
    expect(ACTION_LABELS['create-sub-item']).toBe('Create sub item')
  })
})

describe('label helpers', () => {
  it('resolves a trigger label', () => {
    expect(triggerLabel('phase.completed')).toBe('Phase completed')
  })

  it('resolves an action label', () => {
    expect(actionLabel('notify')).toBe('Notify')
  })

  it('labels every run status', () => {
    expect(RUN_STATUS_LABELS.succeeded).toBe('Succeeded')
    expect(RUN_STATUS_LABELS.failed).toBe('Failed')
    expect(RUN_STATUS_LABELS.skipped).toBe('Skipped')
  })
})
