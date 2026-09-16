/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAppAccess: vi.fn(),
  requireContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/time/approvals',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/auth/require-projects-context', () => ({
  requireAppAccess: mocks.requireAppAccess,
  requireProjectsContext: mocks.requireContext,
}))
vi.mock('@/features/time/components/approvals-data', () => ({
  TimesheetApprovalsData: () => <div>Approvals data</div>,
}))

import TimeApprovalsPage from './page'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAppAccess.mockResolvedValue({
    permissions: ['projects.view', 'projects.edit'],
  })
  mocks.requireContext.mockResolvedValue({ orgId: 'org_1', userId: 'usr_1' })
})

describe('TimeApprovalsPage', () => {
  it('guards the queue on the projects edit permission', async () => {
    render(await TimeApprovalsPage())

    expect(mocks.requireAppAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('renders the queue with a way back to the viewer’s own time', async () => {
    render(await TimeApprovalsPage())

    expect(
      screen.getByRole('heading', { level: 1, name: 'Approvals' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Time' })).toHaveAttribute(
      'href',
      '/time'
    )
    expect(screen.getByText('Approvals data')).toBeInTheDocument()
  })
})
