/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  automationRulesClient: {
    create: mocks.create,
    update: mocks.update,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

const { AutomationRuleForm } = await import('./automation-rule-form')
const { blankUiRule } = await import('@/lib/automation-mappers')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({
    data: { object: 'projects.automation-rule', id: 'arl_1' },
    error: null,
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.automation-rule', id: 'arl_1' },
    error: null,
  })
})

afterEach(cleanup)

describe('AutomationRuleForm', () => {
  it('creates a rule with service-shaped actions', async () => {
    render(<AutomationRuleForm mode="create" initial={blankUiRule()} />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Notify on done' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }))

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Notify on done',
        trigger: 'work-item.created',
        projectId: null,
        actions: [
          { type: 'notify', userId: '', title: '' },
        ],
      })
    )
    expect(await screen.findByText('Create rule')).toBeInTheDocument()
    expect(mocks.push).toHaveBeenCalledWith('/settings/automation')
  })

  it('blocks a create without a name before calling the API', async () => {
    render(<AutomationRuleForm mode="create" initial={blankUiRule()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }))

    expect(await screen.findByText('Rule not created')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
