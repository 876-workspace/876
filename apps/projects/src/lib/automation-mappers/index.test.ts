import { describe, expect, it } from 'vitest'

import {
  blankUiRule,
  serviceActionToUi,
  serviceBlueprintToUi,
  serviceRuleToUi,
  toAutomationTrigger,
  uiActionToService,
  uiRuleToServiceInput,
  uiTransitionsToServiceInput,
} from '../automation-mappers'
import type { ServiceAutomationRule } from '@/types/automations'

const rule: ServiceAutomationRule = {
  object: 'projects.automation-rule',
  id: 'arl_1',
  projectId: null,
  name: 'Notify',
  enabled: true,
  trigger: 'work-item.state-changed',
  conditions: [{ fieldKey: 'priority', op: 'equals', value: 'high' }],
  actions: [{ type: 'notify', userId: 'usr_1', title: 'State changed' }],
  hasWebhookSecret: false,
  createdAt: 1,
  updatedAt: 2,
}

describe('automation-mappers', () => {
  it('maps an assign editor action to a service userId', () => {
    expect(
      uiActionToService({ type: 'assign', params: { assigneeId: 'usr_9' } })
    ).toEqual({ type: 'assign', userId: 'usr_9' })
  })

  it('maps a notify editor message to a service title', () => {
    expect(
      uiActionToService({
        type: 'notify',
        params: { userId: 'usr_1', message: 'Hello' },
      })
    ).toEqual({ type: 'notify', userId: 'usr_1', title: 'Hello' })
  })

  it('converts reminder days into whole-day minute offsets', () => {
    expect(
      uiActionToService({
        type: 'create-reminder',
        params: { title: 'Due soon', daysFromNow: 2 },
      })
    ).toEqual({
      type: 'create-reminder',
      title: 'Due soon',
      offsetMinutesBeforeDue: 2880,
    })
  })

  it('maps a service assign action back to the editor shape', () => {
    expect(serviceActionToUi({ type: 'assign', userId: 'usr_9' })).toEqual({
      type: 'assign',
      params: { assigneeId: 'usr_9' },
    })
  })

  it('falls back to work-item.created for an unknown trigger', () => {
    expect(toAutomationTrigger('spaceship.launched')).toBe('work-item.created')
    expect(serviceRuleToUi({ ...rule, trigger: 'nope' }).trigger).toBe(
      'work-item.created'
    )
  })

  it('converts a service rule into an editable editor rule', () => {
    const ui = serviceRuleToUi(rule)

    expect(ui.object).toBe('projects.automation-rule')
    expect(ui.conditions).toEqual([
      { fieldKey: 'priority', op: 'equals', value: 'high' },
    ])
    expect(ui.actions).toEqual([
      {
        type: 'notify',
        params: { userId: 'usr_1', message: 'State changed' },
      },
    ])
  })

  it('converts an editor rule into a service input with mapped actions', () => {
    const input = uiRuleToServiceInput(serviceRuleToUi(rule))

    expect(input.name).toBe('Notify')
    expect(input.trigger).toBe('work-item.state-changed')
    expect(input.actions).toEqual([
      { type: 'notify', userId: 'usr_1', title: 'State changed' },
    ])
  })

  it('builds a blank editor rule that runs on creation', () => {
    const blank = blankUiRule()

    expect(blank.name).toBe('')
    expect(blank.enabled).toBe(true)
    expect(blank.trigger).toBe('work-item.created')
  })

  it('adapts a service blueprint to the editor shape', () => {
    const ui = serviceBlueprintToUi({
      object: 'projects.workflow-blueprint',
      workItemTypeId: 'wit_1',
      updatedAt: null,
      transitions: [
        {
          id: 'wtr_1',
          workItemTypeId: 'wit_1',
          fromStateKey: null,
          toStateKey: 'done',
          name: 'Ship',
          requiredPermission: null,
          requiredFieldKeys: [],
          requiresComment: true,
        },
      ],
    })

    expect(ui.object).toBe('projects.blueprint')
    expect(ui.updatedAt).toBe(0)
    expect(ui.transitions).toEqual([
      {
        id: 'wtr_1',
        fromStateKey: null,
        toStateKey: 'done',
        name: 'Ship',
        requiredPermission: null,
        requiredFieldKeys: [],
        requiresComment: true,
      },
    ])
  })

  it('strips editor row ids when saving a blueprint', () => {
    expect(
      uiTransitionsToServiceInput([
        {
          id: 'wtr_1',
          fromStateKey: 'todo',
          toStateKey: 'done',
          name: 'Ship',
          requiredPermission: null,
          requiredFieldKeys: ['assignee'],
          requiresComment: false,
        },
      ])
    ).toEqual({
      transitions: [
        {
          fromStateKey: 'todo',
          toStateKey: 'done',
          name: 'Ship',
          requiredPermission: null,
          requiredFieldKeys: ['assignee'],
          requiresComment: false,
        },
      ],
    })
  })
})
