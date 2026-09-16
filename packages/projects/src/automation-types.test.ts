import { describe, expect, it } from 'vitest'

import {
  automationActionSchema,
  automationRuleSchema,
  automationTestSchema,
  automationTriggerSchema,
  notificationSchema,
  workflowBlueprintSchema,
} from './types'

describe('workflow automation contracts', () => {
  it('accepts every documented trigger', () => {
    for (const trigger of [
      'work-item.created',
      'work-item.updated',
      'work-item.state-changed',
      'phase.completed',
      'due-date.approaching',
      'time-entry.submitted',
      'budget.threshold-reached',
    ]) {
      expect(automationTriggerSchema.parse(trigger)).toBe(trigger)
    }
  })

  it('rejects unknown triggers', () => {
    expect(() =>
      automationTriggerSchema.parse('issue.exploded')
    ).toThrow()
  })

  it('discriminates automation actions by type', () => {
    expect(
      automationActionSchema.parse({
        type: 'call-webhook',
        url: 'https://hooks.example.test/x',
      })
    ).toMatchObject({ type: 'call-webhook' })
    expect(() =>
      automationActionSchema.parse({ type: 'fax', number: '1' })
    ).toThrow()
  })

  it('parses automation rules without ever carrying a secret', () => {
    const rule = automationRuleSchema.parse({
      object: 'projects.automation-rule',
      id: 'arl_1',
      projectId: null,
      name: 'R',
      enabled: true,
      trigger: 'work-item.created',
      conditions: [],
      actions: [{ type: 'notify', userId: 'u', title: 't' }],
      hasWebhookSecret: true,
      createdAt: 1,
      updatedAt: 1,
    })
    expect(rule.hasWebhookSecret).toBe(true)
    expect(rule).not.toHaveProperty('webhookSecret')
  })

  it('parses blueprints, tests, and notifications', () => {
    expect(
      workflowBlueprintSchema.parse({
        object: 'projects.workflow-blueprint',
        workItemTypeId: 'wit_1',
        updatedAt: null,
        transitions: [],
      }).object
    ).toBe('projects.workflow-blueprint')
    expect(
      automationTestSchema.parse({
        object: 'projects.automation-test',
        ruleId: 'arl_1',
        subjectType: 'work-item',
        subjectId: 'iss_1',
        matched: true,
        conditions: [],
        plannedActions: [{ type: 'notify' }],
      }).matched
    ).toBe(true)
    expect(
      notificationSchema.parse({
        object: 'projects.notification',
        id: 'ntf_1',
        userId: 'user_1',
        kind: 'automation',
        title: 'Done',
        subjectType: 'work-item',
        subjectId: 'iss_1',
        readAt: null,
        createdAt: 1,
      }).readAt
    ).toBeNull()
  })
})
