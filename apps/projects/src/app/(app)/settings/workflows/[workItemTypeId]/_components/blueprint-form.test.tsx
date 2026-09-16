/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  putBlueprint: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  workflowsClient: { putBlueprint: mocks.putBlueprint },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const { BlueprintForm } = await import('./blueprint-form')

const PROPS = {
  workItemTypeId: 'wit_1',
  typeName: 'Task',
  initial: {
    object: 'projects.blueprint' as const,
    workItemTypeId: 'wit_1',
    transitions: [],
    updatedAt: 0,
  },
  availableStates: [{ key: 'todo', label: 'To do' }],
  availableFieldKeys: ['title', 'assignee'],
  permissionOptions: ['projects.edit'],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.putBlueprint.mockResolvedValue({
    data: { object: 'projects.workflow-blueprint', transitions: [] },
    error: null,
  })
})

afterEach(cleanup)

describe('BlueprintForm', () => {
  it('saves the edited transitions with PUT', async () => {
    render(<BlueprintForm {...PROPS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save blueprint' }))

    expect(mocks.putBlueprint).toHaveBeenCalledWith('wit_1', {
      transitions: [],
    })
    expect(await screen.findByText('Blueprint saved.')).toBeInTheDocument()
  })

  it('shows an AppError when saving fails', async () => {
    mocks.putBlueprint.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    render(<BlueprintForm {...PROPS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save blueprint' }))

    expect(
      await screen.findByText('Task blueprint not saved')
    ).toBeInTheDocument()
  })
})
