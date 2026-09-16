// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeAutomationRule } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listRules: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/automation',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    automationRules: {
      list: mocks.listRules,
    },
  },
}))

import { AutomationData } from './automation-data'

afterEach(cleanup)

describe('AutomationData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listRules.mockResolvedValue({
      data: listOf([makeAutomationRule()]),
      error: null,
    })
  })

  it('fetches automation rules for the host organization', async () => {
    render(
      await AutomationData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listRules).toHaveBeenCalledWith('org_1')
  })

  it('renders rule names with trigger and status', async () => {
    render(
      await AutomationData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(screen.getAllByText('Ping on review').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Work item state changed').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0)
  })

  it('links each row under the host automation root', async () => {
    render(
      await AutomationData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(
      screen.getByRole('link', { name: 'Ping on review' })
    ).toHaveAttribute('href', '/workspace/acme/projects/automation/rule_1')
  })

  it('shows the shared empty state when no rules exist', async () => {
    mocks.listRules.mockResolvedValue({ data: listOf([]), error: null })

    render(
      await AutomationData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getAllByText('No automation rules yet').length
    ).toBeGreaterThan(0)
  })

  it('surfaces a banner when rules cannot be loaded', async () => {
    mocks.listRules.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await AutomationData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Automation data could not be loaded')
    ).toBeInTheDocument()
  })
})
