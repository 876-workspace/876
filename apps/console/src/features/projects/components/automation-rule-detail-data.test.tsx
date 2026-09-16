// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeAutomationRule,
  makeAutomationRun,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveRule: vi.fn(),
  listRuns: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/automation/rule_1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    automationRules: {
      retrieve: mocks.retrieveRule,
      listRuns: mocks.listRuns,
    },
  },
}))

import { AutomationRuleDetailData } from './automation-rule-detail-data'

function renderDetail(
  ruleId = 'rule_1',
  base = '/projects',
  overrides?: { secret?: boolean }
) {
  if (overrides?.secret !== undefined) {
    mocks.retrieveRule.mockResolvedValue({
      data: makeAutomationRule({ hasWebhookSecret: overrides.secret }),
      error: null,
    })
  }
  return AutomationRuleDetailData({
    organizationId: 'org_1',
    base,
    ruleId,
  })
}

afterEach(cleanup)

describe('AutomationRuleDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveRule.mockResolvedValue({
      data: makeAutomationRule(),
      error: null,
    })
    mocks.listRuns.mockResolvedValue({
      data: listOf([makeAutomationRun()]),
      error: null,
    })
  })

  it('retrieves the decoded rule and its runs for the host organization', async () => {
    render(await renderDetail('rule%2Fone'))

    expect(mocks.retrieveRule).toHaveBeenCalledWith('org_1', 'rule/one')
    expect(mocks.listRuns).toHaveBeenCalledWith('org_1', 'rule/one')
  })

  it('renders the rule definition with trigger and status', async () => {
    render(await renderDetail())

    expect(screen.getByText('Ping on review')).toBeInTheDocument()
    expect(
      screen.getAllByText('Work item state changed').length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('renders conditions and labeled actions with params', async () => {
    render(await renderDetail())

    expect(screen.getByText('priority equals high')).toBeInTheDocument()
    expect(screen.getByText('Notify')).toBeInTheDocument()
    expect(screen.getByText(/user_eng/)).toBeInTheDocument()
  })

  it('shows webhook presence without ever rendering a secret value', async () => {
    render(await renderDetail('rule_1', '/projects', { secret: true }))

    expect(screen.getByText('Configured')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/whsec|secret-value/i)
  })

  it('shows Not configured when the rule has no webhook secret', async () => {
    render(await renderDetail())

    expect(screen.getByText('Not configured')).toBeInTheDocument()
  })

  it('renders the shared runs table with attempt and status', async () => {
    render(await renderDetail())

    expect(screen.getByText('Runs (1)')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('rule_1')).toBeInTheDocument()
  })

  it('links back under the host automation root', async () => {
    render(
      await renderDetail('rule_1', '/workspace/acme/projects')
    )

    expect(
      screen.getByRole('link', { name: 'Back to automation' })
    ).toHaveAttribute('href', '/workspace/acme/projects/automation')
  })

  it('sends unknown rules to the not-found boundary', async () => {
    mocks.retrieveRule.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/automation-rule-not-found',
        message: 'missing',
      },
    })

    render(await renderDetail())

    expect(mocks.notFound).toHaveBeenCalled()
  })
})
