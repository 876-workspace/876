/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ testRule: vi.fn() }))

vi.mock('@/lib/client', () => ({
  automationRulesClient: { test: mocks.testRule },
}))

const { AutomationTestPanel } = await import('./automation-test-panel')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.testRule.mockResolvedValue({
    data: {
      object: 'projects.automation-test',
      ruleId: 'arl_1',
      subjectType: 'work-item',
      subjectId: 'PROJ-1',
      matched: true,
      conditions: [{ fieldKey: 'priority', op: 'equals', matched: true }],
      plannedActions: [{ type: 'notify' }],
    },
    error: null,
  })
})

afterEach(cleanup)

describe('AutomationTestPanel', () => {
  it('dry-runs the rule and shows matched conditions', async () => {
    render(<AutomationTestPanel ruleId="arl_1" />)

    fireEvent.change(screen.getByLabelText('Work item identifier'), {
      target: { value: 'PROJ-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test' }))

    expect(mocks.testRule).toHaveBeenCalledWith('arl_1', {
      subjectId: 'PROJ-1',
    })
    expect(await screen.findByText('Would run')).toBeInTheDocument()
    expect(screen.getByText('priority')).toBeInTheDocument()
    expect(screen.getByText('Notify')).toBeInTheDocument()
  })

  it('reports a rule that would not run', async () => {
    mocks.testRule.mockResolvedValue({
      data: {
        object: 'projects.automation-test',
        ruleId: 'arl_1',
        subjectType: 'work-item',
        subjectId: 'PROJ-2',
        matched: false,
        conditions: [{ fieldKey: 'priority', op: 'equals', matched: false }],
        plannedActions: [],
      },
      error: null,
    })
    render(<AutomationTestPanel ruleId="arl_1" />)

    fireEvent.change(screen.getByLabelText('Work item identifier'), {
      target: { value: 'PROJ-2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test' }))

    expect(await screen.findByText('Would not run')).toBeInTheDocument()
  })

  it('shows an AppError when the dry run fails', async () => {
    mocks.testRule.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    render(<AutomationTestPanel ruleId="arl_1" />)

    fireEvent.change(screen.getByLabelText('Work item identifier'), {
      target: { value: 'PROJ-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test' }))

    expect(await screen.findByText('Dry run failed')).toBeInTheDocument()
  })
})
