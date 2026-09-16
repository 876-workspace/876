/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAppAccess: vi.fn(),
  requireContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/prj_1/time',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/auth/require-projects-context', () => ({
  requireAppAccess: mocks.requireAppAccess,
  requireProjectsContext: mocks.requireContext,
}))
vi.mock('@/lib/auth/access-context', () => ({
  canAccess: (context: { permissions: string[] }, permission: string) =>
    context.permissions.includes(permission),
}))
vi.mock('@/features/time/components/project-time-data', () => ({
  ProjectTimeData: () => <div>Project time data</div>,
}))

import ProjectTimePage from './page'

function renderPage(searchParams: { entry?: string } = {}) {
  return ProjectTimePage({
    params: Promise.resolve({ projectId: 'prj_1' }),
    searchParams: Promise.resolve(searchParams),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAppAccess.mockResolvedValue({
    permissions: ['projects.view', 'projects.edit'],
  })
  mocks.requireContext.mockResolvedValue({ orgId: 'org_1', userId: 'usr_1' })
})

describe('ProjectTimePage', () => {
  it('guards the project’s time tab on the projects view permission', async () => {
    render(await renderPage())

    expect(mocks.requireAppAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('renders the Time toolbar above the streamed entries', async () => {
    render(await renderPage())

    expect(
      screen.getByRole('heading', { level: 1, name: 'Time' })
    ).toBeInTheDocument()
    expect(screen.getByText('Project time data')).toBeInTheDocument()
  })

  it('links the project tabs to the time route', async () => {
    render(await renderPage())

    expect(screen.getByRole('link', { name: 'Time' })).toHaveAttribute(
      'href',
      '/projects/prj_1/time'
    )
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects'
    )
  })

  it('opens the add form for this project from the toolbar', async () => {
    render(await renderPage())

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/projects/prj_1/time?entry=new'
    )
  })
})
