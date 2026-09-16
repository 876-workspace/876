/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAppAccess: vi.fn(),
  requireContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/time',
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
vi.mock('@/features/time/components/my-time-data', () => ({
  MyTimeData: () => <div>My time data</div>,
}))

import TimePage from './page'

const PERIOD = { from: '1704067200', to: '1704671999' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAppAccess.mockResolvedValue({
    permissions: ['projects.view', 'projects.edit'],
  })
  mocks.requireContext.mockResolvedValue({ orgId: 'org_1', userId: 'usr_1' })
})

describe('TimePage', () => {
  it('guards the page on the projects module and its view permission', async () => {
    render(await TimePage({ searchParams: Promise.resolve({}) }))

    expect(mocks.requireAppAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('keeps the shown period when the add form opens', async () => {
    render(await TimePage({ searchParams: Promise.resolve(PERIOD) }))

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/time?from=1704067200&to=1704671999&entry=new'
    )
    expect(screen.getByText('Jan 1 – Jan 7')).toBeInTheDocument()
    expect(screen.getByText('My time data')).toBeInTheDocument()
  })

  it('offers the approval queue to a viewer who can decide', async () => {
    const user = userEvent.setup()
    render(await TimePage({ searchParams: Promise.resolve(PERIOD) }))

    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      await screen.findByRole('menuitem', { name: 'Approvals' })
    ).toBeVisible()
  })

  it('hides the approval queue from a viewer who cannot decide', async () => {
    const user = userEvent.setup()
    mocks.requireAppAccess.mockResolvedValue({
      permissions: ['projects.view'],
    })
    render(await TimePage({ searchParams: Promise.resolve(PERIOD) }))

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await screen.findByRole('menuitem', { name: 'Refresh' })

    expect(screen.queryByRole('menuitem', { name: 'Approvals' })).toBeNull()
  })

  it('falls back to the current week when the query is not a period', async () => {
    const invalid = render(
      await TimePage({
        searchParams: Promise.resolve({ from: 'yesterday', to: 'today' }),
      })
    )
    const invalidRange = invalid.container.querySelector(
      '[data-period-range]'
    )?.textContent
    invalid.unmount()

    const bare = render(await TimePage({ searchParams: Promise.resolve({}) }))

    expect(
      bare.container.querySelector('[data-period-range]')?.textContent
    ).toBe(invalidRange)
  })
})
