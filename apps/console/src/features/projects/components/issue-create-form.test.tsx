/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IssueCreateForm } from './issue-create-form'

const { createIssue } = vi.hoisted(() => ({ createIssue: vi.fn() }))
const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { issues: { create: createIssue } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const mockProjects = [{ id: 'proj_1', name: 'Console', key: 'CONSOLE' }]

describe('IssueCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createIssue.mockResolvedValue({
      data: { id: 'iss_1', identifier: 'CONSOLE-12' },
      error: null,
    })
  })

  it('submits the exact body including creatorUserId when required fields are filled', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_1',
      title: 'Fix issue creation layout',
      description: null,
      creatorUserId: 'user_operator_1',
    })
  })

  it('omits status and priority when untouched', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_1',
      title: 'Fix issue creation layout',
      description: null,
      creatorUserId: 'user_operator_1',
    })
  })

  it('includes status and priority when chosen', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'in-progress'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Priority' }),
      'urgent'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_1',
      title: 'Fix issue creation layout',
      description: null,
      creatorUserId: 'user_operator_1',
      status: 'in-progress',
      priority: 'urgent',
    })
  })

  it('does not submit with no project selected', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).not.toHaveBeenCalled()
  })

  it('does not submit with a blank title', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).not.toHaveBeenCalled()
  })

  it('navigates to the identifier on success, not the id', async () => {
    const user = userEvent.setup()
    createIssue.mockResolvedValueOnce({
      data: { id: 'iss_abc123', identifier: 'CONSOLE-12' },
      error: null,
    })
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/projects/issues/CONSOLE-12')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('renders the error and does not navigate on failure', async () => {
    const user = userEvent.setup()
    createIssue.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'validation_error',
        message: 'Issue title cannot be blank.',
      },
    })
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Issue title cannot be blank.')
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('renders the "Create a project before opening an issue." empty state, with no form controls, when projects is []', () => {
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={[]}
        currentUserId="user_operator_1"
      />
    )

    expect(
      screen.getByText('Create a project before opening an issue.')
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'New project' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/projects/projects/new')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
  })

  it('includes description when filled', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'proj_1'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'Fix issue creation layout'
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Steps to reproduce the crash...'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createIssue).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_1',
      title: 'Fix issue creation layout',
      description: 'Steps to reproduce the crash...',
      creatorUserId: 'user_operator_1',
    })
  })

  it('navigates back to the issues list when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <IssueCreateForm
        organizationId="org_1"
        base="/projects"
        projects={mockProjects}
        currentUserId="user_operator_1"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/projects/issues')
    expect(createIssue).not.toHaveBeenCalled()
  })
})
