// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeWorkflowBlueprint,
  makeWorkflowState,
  makeWorkflowTransition,
  makeWorkItemType,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listTypes: vi.fn(),
  listStates: vi.fn(),
  getBlueprint: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/workflows',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    workItemTypes: {
      list: mocks.listTypes,
    },
    workflowStates: {
      list: mocks.listStates,
    },
    workflows: {
      getBlueprint: mocks.getBlueprint,
    },
  },
}))

import { WorkflowsData } from './workflows-data'

afterEach(cleanup)

describe('WorkflowsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTypes.mockResolvedValue({
      data: listOf([makeWorkItemType()]),
      error: null,
    })
    mocks.listStates.mockResolvedValue({
      data: listOf([
        makeWorkflowState(),
        makeWorkflowState({
          id: 'ws_prog',
          key: 'in-progress',
          name: 'In Progress',
        }),
      ]),
      error: null,
    })
    mocks.getBlueprint.mockResolvedValue({
      data: makeWorkflowBlueprint(),
      error: null,
    })
  })

  it('fetches work item types, states, and blueprints for the organization', async () => {
    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(mocks.listTypes).toHaveBeenCalledWith('org_1')
    expect(mocks.listStates).toHaveBeenCalledWith('org_1')
    expect(mocks.getBlueprint).toHaveBeenCalledWith('org_1', 'wit_task_1')
  })

  it('renders one section per work item type with its transition count', async () => {
    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('task · 1 transition')).toBeInTheDocument()
    expect(screen.getAllByText('Start work').length).toBeGreaterThan(0)
  })

  it('resolves state keys to state names in the transitions table', async () => {
    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders Any for transitions from any state', async () => {
    mocks.getBlueprint.mockResolvedValue({
      data: makeWorkflowBlueprint({
        transitions: [makeWorkflowTransition({ fromStateKey: null })],
      }),
      error: null,
    })

    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getByText('Any')).toBeInTheDocument()
  })

  it('marks transitions that require a comment', async () => {
    mocks.getBlueprint.mockResolvedValue({
      data: makeWorkflowBlueprint({
        transitions: [makeWorkflowTransition({ requiresComment: true })],
      }),
      error: null,
    })

    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
  })

  it('explains that an empty blueprint keeps every state change allowed', async () => {
    mocks.getBlueprint.mockResolvedValue({
      data: makeWorkflowBlueprint({ transitions: [] }),
      error: null,
    })

    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getAllByText('No transitions yet').length).toBeGreaterThan(
      0
    )
    expect(
      screen.getByText(
        'All state changes stay allowed until the first transition is added.'
      )
    ).toBeInTheDocument()
  })

  it('shows the shared empty state when no work item types exist', async () => {
    mocks.listTypes.mockResolvedValue({ data: listOf([]), error: null })

    render(await WorkflowsData({ organizationId: 'org_1' }))

    expect(screen.getByText('No work item types yet')).toBeInTheDocument()
    expect(mocks.getBlueprint).not.toHaveBeenCalled()
  })
})
