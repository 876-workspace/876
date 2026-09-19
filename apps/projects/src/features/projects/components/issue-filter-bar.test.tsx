/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Label, Project } from '@876/projects/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { IssueGroupBy, IssueSearchParams } from '@/types/issues'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  search: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  usePathname: () => '/issues',
  useSearchParams: () => new URLSearchParams(mocks.search),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { IssueFilterBar } = await import('./issue-filter-bar')

function makeProject(): Project {
  return {
    object: 'projects.project',
    id: 'prj_1',
    tenantId: 'tnt_1',
    name: 'Console',
    key: 'CON',
    slug: 'console',
    description: null,
    leadUserId: null,
    status: 'active',
    health: 'on-track',
    startDate: null,
    targetDate: null,
    nextIssueNumber: 1,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
    memberCount: 1,
    customFields: [],
  }
}

function makeLabel(): Label {
  return {
    object: 'projects.label',
    id: 'lbl_1',
    tenantId: 'tnt_1',
    name: 'bug',
    color: '#ff0000',
    description: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

const MEMBERS = [{ userId: 'user_1', label: 'Raheem' }]

function renderBar({
  action = '/issues',
  values = {},
  groupBy = 'none',
  search = '',
  allowUngrouped,
}: {
  action?: '/issues' | '/board'
  values?: IssueSearchParams
  groupBy?: IssueGroupBy
  search?: string
  allowUngrouped?: boolean
} = {}) {
  mocks.search = search
  return render(
    <IssueFilterBar
      action={action}
      values={values}
      groupBy={groupBy}
      projects={[makeProject()]}
      labels={[makeLabel()]}
      members={MEMBERS}
      allowUngrouped={allowUngrouped}
    />
  )
}

function openDesktopPopover() {
  fireEvent.click(
    screen.getAllByRole('button', { name: /^Filters/ })[0]
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.search = ''
})

afterEach(cleanup)

describe('IssueFilterBar', () => {
  it('shows the active filter count on the Filters trigger', () => {
    renderBar({
      values: { project: 'prj_1', priority: 'high', assignee: 'user_1' },
    })

    expect(
      screen.getAllByRole('button', { name: 'Filters · 3' })
    ).toHaveLength(2)
  })

  it('renders no chips and no Clear all when no filters are applied', () => {
    renderBar()

    expect(
      screen.getAllByRole('button', { name: 'Filters' })
    ).toHaveLength(2)
    expect(screen.queryByText(/Project:/)).toBeNull()
    expect(screen.queryByText(/Priority:/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Clear all' })).toBeNull()
  })

  it('renders one chip per applied filter with the human label', () => {
    renderBar({
      values: {
        project: 'prj_1',
        priority: 'high',
        assignee: 'user_1',
        label: 'lbl_1',
        order: 'updated',
      },
      groupBy: 'status',
      search: 'group=status',
    })

    expect(screen.getByText('Project: Console')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByText('Assignee: Raheem')).toBeInTheDocument()
    expect(screen.getByText('Label: bug')).toBeInTheDocument()
    expect(screen.getByText('Order: Recently updated')).toBeInTheDocument()
    expect(screen.getByText('Group: Workflow state')).toBeInTheDocument()
  })

  it('drops only that param from a chip remove link and keeps the others', () => {
    renderBar({
      values: { project: 'prj_1', priority: 'high', assignee: 'user_1' },
      search: 'project=prj_1&priority=high&assignee=user_1',
    })

    expect(
      screen.getByRole('link', { name: 'Remove project filter' })
    ).toHaveAttribute('href', '/issues?priority=high&assignee=user_1')
  })

  it('clears the after/before cursors when a filter is removed', () => {
    renderBar({
      values: { project: 'prj_1' },
      search: 'project=prj_1&after=cur1&before=cur0',
    })

    expect(
      screen.getByRole('link', { name: 'Remove project filter' })
    ).toHaveAttribute('href', '/issues')
  })

  it('links Clear all back to the unfiltered list path', () => {
    renderBar({
      values: { project: 'prj_1', priority: 'high' },
      search: 'project=prj_1&priority=high',
    })

    expect(screen.getByRole('link', { name: 'Clear all' })).toHaveAttribute(
      'href',
      '/issues'
    )
  })

  it('lists every non-status filter in the popover', () => {
    renderBar()
    openDesktopPopover()

    for (const label of [
      'Project',
      'Priority',
      'Assignee',
      'Label',
      'Order',
      'Group',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('has no Status control and no Apply button in the popover', () => {
    renderBar()
    openDesktopPopover()

    expect(screen.queryByLabelText('Status')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Apply filters' })
    ).toBeNull()
  })

  it('omits the No grouping option when allowUngrouped is false', () => {
    renderBar({ action: '/board', groupBy: 'status', allowUngrouped: false })
    openDesktopPopover()

    const groupSelect = screen.getByLabelText('Group')
    expect(
      within(groupSelect).queryByRole('option', { name: 'No grouping' })
    ).toBeNull()
    expect(
      within(groupSelect).getByRole('option', { name: 'Workflow state' })
    ).toBeInTheDocument()
  })

  it('offers No grouping by default', () => {
    renderBar()
    openDesktopPopover()

    expect(
      within(screen.getByLabelText('Group')).getByRole('option', {
        name: 'No grouping',
      })
    ).toBeInTheDocument()
  })

  it('pushes the updated URL and clears cursors when a control changes', () => {
    renderBar({
      values: { project: 'prj_1' },
      search: 'project=prj_1&after=cur',
    })
    openDesktopPopover()

    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    })

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(
      '/issues?project=prj_1&priority=high'
    )
  })

  it('submits the search input with the q param and clears cursors', () => {
    renderBar({ search: 'after=cur' })

    fireEvent.change(screen.getByLabelText('Search issues'), {
      target: { value: 'PROJ-12' },
    })
    fireEvent.submit(screen.getByRole('search'))

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/issues?q=PROJ-12')
  })
})
