// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AutomationRuleEditor } from './automation-rule-editor'
import type { AutomationRule } from './types'

function makeRule(overrides?: Partial<AutomationRule>): AutomationRule {
  return {
    object: 'projects.automation-rule',
    id: 'rule_1',
    projectId: 'proj_1',
    name: 'Ping on review',
    enabled: true,
    trigger: 'work-item.state-changed',
    conditions: [{ fieldKey: 'state', op: 'equals', value: 'review' }],
    actions: [{ type: 'notify', params: { userId: 'u_1', message: 'hi' } }],
    hasWebhookSecret: true,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

function ruleOf(container: HTMLElement): AutomationRule {
  const input = container.querySelector<HTMLInputElement>('input[name="rule"]')
  if (!input) throw new Error('Expected a rule input')
  return JSON.parse(input.value) as AutomationRule
}

function renderEditor(rule: AutomationRule = makeRule()) {
  const view = render(<AutomationRuleEditor initial={rule} />)
  return { ...view, rule: () => ruleOf(view.container) }
}

describe('AutomationRuleEditor', () => {
  afterEach(cleanup)

  it('posts the rule as a hidden field', () => {
    const { container } = renderEditor()
    const input = container.querySelector('input[name="rule"]')

    expect(input).toHaveAttribute('type', 'hidden')
    expect(input).toHaveAttribute('name', 'rule')
  })

  it('serializes the rule it was given', () => {
    const { rule } = renderEditor()
    const initial = makeRule()

    expect(rule()).toEqual(initial)
  })

  it('keeps the id, project, and secret flag while editing', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Renamed' },
    })

    expect(rule().id).toBe('rule_1')
    expect(rule().projectId).toBe('proj_1')
    expect(rule().hasWebhookSecret).toBe(true)
  })

  it('edits the rule name', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Renamed' },
    })

    expect(rule().name).toBe('Renamed')
  })

  it('toggles enabled off', () => {
    const { rule } = renderEditor()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled' }))

    expect(rule().enabled).toBe(false)
  })

  it('changes the trigger', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Trigger'), {
      target: { value: 'phase.completed' },
    })

    expect(rule().trigger).toBe('phase.completed')
  })

  it('adds a condition row', () => {
    const { rule } = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Add condition' }))

    expect(rule().conditions).toHaveLength(2)
  })

  it('removes a condition row', () => {
    const { rule } = renderEditor()

    fireEvent.click(
      document
        .querySelector('[data-slot="automation-rule-condition"]')
        ?.querySelector('button') as HTMLButtonElement
    )

    expect(rule().conditions).toEqual([])
  })

  it('edits the condition field key', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Condition field 1'), {
      target: { value: 'priority' },
    })

    expect(rule().conditions[0].fieldKey).toBe('priority')
  })

  it('splits an is-one-of condition into an array', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Condition operator 1'), {
      target: { value: 'in' },
    })
    fireEvent.change(screen.getByLabelText('Condition value 1'), {
      target: { value: 'open, review' },
    })

    expect(rule().conditions[0]).toEqual({
      fieldKey: 'state',
      op: 'in',
      value: ['open', 'review'],
    })
  })

  it('drops the value for an emptiness check and hides its input', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Condition operator 1'), {
      target: { value: 'is-empty' },
    })

    expect(rule().conditions[0]).toEqual({
      fieldKey: 'state',
      op: 'is-empty',
    })
    expect(
      screen.queryByLabelText('Condition value 1')
    ).not.toBeInTheDocument()
  })

  it('adds an action row', () => {
    const { rule } = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Add action' }))

    expect(rule().actions).toHaveLength(2)
    expect(rule().actions[1].type).toBe('set-field')
  })

  it('removes an action row', () => {
    const { rule } = renderEditor(makeRule({ actions: [] }))

    expect(rule().actions).toEqual([])
    expect(screen.getByText('No actions yet.')).toBeInTheDocument()
  })

  it('changes the action type and renders its param fields', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Action 1 type'), {
      target: { value: 'assign' },
    })

    expect(rule().actions[0].type).toBe('assign')
    expect(screen.getByLabelText('Action 1 Assignee ID')).toBeInTheDocument()
  })

  it('edits an action param', () => {
    const { rule } = renderEditor()

    fireEvent.change(screen.getByLabelText('Action 1 Message'), {
      target: { value: 'Review started' },
    })

    expect(rule().actions[0].params.message).toBe('Review started')
  })

  it('parses a numeric action param', () => {
    const { rule } = renderEditor(
      makeRule({
        actions: [
          { type: 'create-reminder', params: { title: 'Nudge', daysFromNow: 1 } },
        ],
      })
    )

    fireEvent.change(screen.getByLabelText('Action 1 Days from now'), {
      target: { value: '3' },
    })

    expect(rule().actions[0].params.daysFromNow).toBe(3)
  })

  it('shows the webhook secret only for call-webhook actions', () => {
    renderEditor()

    expect(screen.queryByLabelText('Webhook secret')).not.toBeInTheDocument()
  })

  it('shows the webhook secret as a blank password input for call-webhook', () => {
    renderEditor(
      makeRule({
        actions: [{ type: 'call-webhook', params: { url: 'https://x.test' } }],
      })
    )

    const secret = screen.getByLabelText('Webhook secret')
    expect(secret).toHaveAttribute('type', 'password')
    expect(secret).toHaveAttribute('name', 'webhookSecret')
    expect(secret).toHaveValue('')
  })

  it('reveals the secret input when an action becomes call-webhook', () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Action 1 type'), {
      target: { value: 'call-webhook' },
    })

    expect(screen.getByLabelText('Webhook secret')).toBeInTheDocument()
    expect(screen.getByText(/Blank keeps the existing secret/)).toBeInTheDocument()
  })

  it('submits the rule through a surrounding form', () => {
    const initial = makeRule()
    const { container } = render(
      <form>
        <AutomationRuleEditor initial={initial} />
      </form>
    )
    const form = container.querySelector('form')
    if (!form) throw new Error('Expected a form')

    const posted = new FormData(form).get('rule')
    if (typeof posted !== 'string') throw new Error('Expected a rule')

    expect(JSON.parse(posted)).toEqual(initial)
  })
})
