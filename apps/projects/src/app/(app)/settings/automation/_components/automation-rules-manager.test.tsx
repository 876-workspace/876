/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceAutomationRule } from '@/types/automations'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  automationRulesClient: {
    update: mocks.update,
    remove: mocks.remove,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const { AutomationRulesManager } = await import('./automation-rules-manager')

function makeRule(
  overrides: Partial<ServiceAutomationRule> = {}
): ServiceAutomationRule {
  return {
    object: 'projects.automation-rule',
    id: 'arl_1',
    projectId: null,
    name: 'Notify on done',
    enabled: true,
    trigger: 'work-item.state-changed',
    conditions: [],
    actions: [{ type: 'notify', userId: 'usr_1', title: 'Done' }],
    hasWebhookSecret: false,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({
    data: { ...makeRule(), enabled: false },
    error: null,
  })
  mocks.remove.mockResolvedValue({ data: makeRule(), error: null })
})

afterEach(cleanup)

describe('AutomationRulesManager', () => {
  it('lists rules with their trigger and status', () => {
    render(
      <AutomationRulesManager
        initial={[makeRule()]}
        hrefBase="/settings/automation"
      />
    )

    expect(screen.getAllByText('Notify on done').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Work item state changed').length
    ).toBeGreaterThan(0)
  })

  it('disables an enabled rule', async () => {
    render(
      <AutomationRulesManager
        initial={[makeRule()]}
        hrefBase="/settings/automation"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    expect(mocks.update).toHaveBeenCalledWith('arl_1', { enabled: false })
    expect(
      await screen.findByRole('button', { name: 'Enable' })
    ).toBeInTheDocument()
  })

  it('deletes a rule and removes its row', async () => {
    render(
      <AutomationRulesManager
        initial={[makeRule()]}
        hrefBase="/settings/automation"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(mocks.remove).toHaveBeenCalledWith('arl_1')
    expect(
      await screen.findAllByText('No automation rules yet')
    ).not.toHaveLength(0)
  })
})
