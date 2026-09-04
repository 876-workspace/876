import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { create: mocks.createIssue },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { NewIssueForm } from './new-issue-form'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createIssue.mockResolvedValue({
    data: { identifier: 'PROJECT-1' },
    error: null,
  })
})

describe('NewIssueForm', () => {
  it('sends active defaults and omits unset optional values', async () => {
    render(
      <NewIssueForm
        workItemTypes={[
          {
            object: 'projects.work-item-type',
            id: 'type_1',
            tenantId: 'tenant_1',
            key: 'bug',
            name: 'Bug',
            iconKey: 'bug',
            color: '#ef4444',
            hierarchyLevel: 1,
            description: null,
            isDefault: true,
            position: 0,
            archivedAt: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
        workflowStates={[
          {
            object: 'projects.workflow-state',
            id: 'state_1',
            tenantId: 'tenant_1',
            key: 'triage',
            name: 'Triage',
            category: 'backlog',
            color: '#6b7280',
            description: null,
            isDefault: true,
            position: 0,
            archivedAt: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
        projects={[]}
        milestones={[]}
        customFields={[]}
      />
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Ship the fix' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() =>
      expect(mocks.createIssue).toHaveBeenCalledWith({
        title: 'Ship the fix',
        projectId: undefined,
        description: null,
        typeKey: 'bug',
        status: 'triage',
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/issues/PROJECT-1')
    expect(mocks.refresh).toHaveBeenCalled()
  })
})
