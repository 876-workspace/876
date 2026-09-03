/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectCreateForm } from './project-create-form'

const { createProject } = vi.hoisted(() => ({ createProject: vi.fn() }))
const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { projects: { create: createProject } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

describe('ProjectCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createProject.mockResolvedValue({
      data: { id: 'proj_console_1' },
      error: null,
    })
  })

  it('submits with the exact body for a name + key only', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).toHaveBeenCalledWith('org_1', {
      name: 'Console',
      key: 'CONSOLE',
      description: null,
    })
  })

  it('upper-cases a lower-case key before sending', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'console')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).toHaveBeenCalledWith('org_1', {
      name: 'Console',
      key: 'CONSOLE',
      description: null,
    })
  })

  it('includes status and health when they are chosen', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'active'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Health' }),
      'on-track'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).toHaveBeenCalledWith('org_1', {
      name: 'Console',
      key: 'CONSOLE',
      description: null,
      status: 'active',
      health: 'on-track',
    })
  })

  it('does not call client.projects.create when the name is blank', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).not.toHaveBeenCalled()
  })

  it('does not call client.projects.create when the key is blank', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).not.toHaveBeenCalled()
  })

  it('navigates to the new project detail route and calls refresh exactly once on success', async () => {
    const user = userEvent.setup()
    createProject.mockResolvedValueOnce({
      data: { id: 'proj_console_1' },
      error: null,
    })
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/projects/projects/proj_console_1')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('renders the error message and does not navigate when the result carries an error', async () => {
    const user = userEvent.setup()
    createProject.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'conflict',
        message: 'A project with key CONSOLE already exists.',
      },
    })
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('A project with key CONSOLE already exists.')
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('includes description when filled', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Console')
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'CONSOLE')
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Core developer console and administration tools'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createProject).toHaveBeenCalledWith('org_1', {
      name: 'Console',
      key: 'CONSOLE',
      description: 'Core developer console and administration tools',
    })
  })

  it('navigates back to the projects list when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm organizationId="org_1" base="/projects" />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/projects/projects')
    expect(createProject).not.toHaveBeenCalled()
  })
})
