// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AutomationRuleList } from './automation-rule-list'
import type { AutomationRule } from './types'

function makeRule(overrides?: Partial<AutomationRule>): AutomationRule {
  return {
    object: 'projects.automation-rule',
    id: 'rule_1',
    projectId: null,
    name: 'Ping on review',
    enabled: true,
    trigger: 'work-item.state-changed',
    conditions: [],
    actions: [{ type: 'notify', params: { message: 'hi' } }],
    hasWebhookSecret: false,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('AutomationRuleList', () => {
  afterEach(cleanup)

  it('links the rule name to its detail path', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Ping on review',
      })
    ).toHaveAttribute('href', '/rules/rule_1')
  })

  it('encodes the rule id in the href', () => {
    render(
      <AutomationRuleList
        rules={[makeRule({ id: 'rule/one two' })]}
        hrefBase="/rules"
      />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Ping on review',
      })
    ).toHaveAttribute('href', '/rules/rule%2Fone%20two')
  })

  it('trims a trailing slash on hrefBase', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules/" />)

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Ping on review',
      })
    ).toHaveAttribute('href', '/rules/rule_1')
  })

  it('renders the trigger label', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    expect(
      within(screen.getByRole('table')).getByText('Work item state changed')
    ).toBeInTheDocument()
  })

  it('badges an enabled rule', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    expect(
      within(screen.getByRole('table')).getByText('Enabled')
    ).toBeInTheDocument()
  })

  it('badges a disabled rule', () => {
    render(
      <AutomationRuleList
        rules={[makeRule({ enabled: false })]}
        hrefBase="/rules"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText('Disabled')
    ).toBeInTheDocument()
  })

  it('renders the action count', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    expect(
      within(screen.getByRole('table')).getByText('1 action')
    ).toBeInTheDocument()
  })

  it('pluralizes the action count', () => {
    render(
      <AutomationRuleList
        rules={[
          makeRule({
            actions: [
              { type: 'notify', params: {} },
              { type: 'assign', params: {} },
            ],
          }),
        ]}
        hrefBase="/rules"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText('2 actions')
    ).toBeInTheDocument()
  })

  it('renders the updated date', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    expect(
      within(screen.getByRole('table')).getByText('Mar 4, 2026')
    ).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(<AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />)

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual(['Rule', 'Trigger', 'Status', 'Actions', 'Updated'])
  })

  it('renders a mobile row per rule', () => {
    const { container } = render(
      <AutomationRuleList rules={[makeRule()]} hrefBase="/rules" />
    )
    const list = container.querySelector('ul')
    if (!list) throw new Error('Expected a mobile list')

    expect(
      within(list).getByRole('link', { name: 'View rule Ping on review' })
    ).toHaveAttribute('href', '/rules/rule_1')
  })

  it('renders the empty state with no links', () => {
    const { container } = render(
      <AutomationRuleList rules={[]} hrefBase="/rules" />
    )

    expect(screen.getAllByText('No automation rules yet')).toHaveLength(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
