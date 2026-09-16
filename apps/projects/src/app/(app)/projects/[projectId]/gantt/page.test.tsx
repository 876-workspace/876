/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/prj_1/gantt',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/auth/require-projects-context', () => ({
  requireAppAccess: vi.fn().mockResolvedValue(undefined),
  requireProjectsContext: vi
    .fn()
    .mockResolvedValue({ orgId: 'org_1', userId: 'usr_1' }),
}))

vi.mock('@/features/projects/components/gantt-data', () => ({
  GanttData: () => <div>Gantt data</div>,
}))

import ProjectGanttPage from './page'

describe('ProjectGanttPage', () => {
  it('renders the Gantt toolbar above the streamed timeline', async () => {
    render(
      await ProjectGanttPage({
        params: Promise.resolve({ projectId: 'prj_1' }),
        searchParams: Promise.resolve({}),
      })
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Gantt' })
    ).toBeInTheDocument()
    expect(screen.getByText('Gantt data')).toBeInTheDocument()
  })

  it('links the project tabs to the overview and gantt routes', async () => {
    render(
      await ProjectGanttPage({
        params: Promise.resolve({ projectId: 'prj_1' }),
        searchParams: Promise.resolve({}),
      })
    )

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/projects/prj_1'
    )
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute(
      'href',
      '/projects/prj_1/gantt'
    )
  })
})
