// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Issue, IssueEvent } from '@876/projects/contracts'

import { IssueDetail } from './issue-detail'

function makeIssue(overrides?: Partial<Issue>): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_console_12',
    tenantId: 'tenant_1',
    projectId: 'proj_console',
    projectKey: 'CONSOLE',
    number: 12,
    identifier: 'CONSOLE-12',
    title: 'Sidebar overlaps the editor on narrow screens',
    description:
      '## Repro steps\n\n- Open the editor below 640px\n- Toggle the sidebar\n\nThe layout breaks in `SidebarShell`.',
    status: 'in-progress',
    priority: 'high',
    assigneeUserId: 'user_ana',
    creatorUserId: 'user_ben',
    parentIssueId: null,
    estimate: 3,
    dueDate: 1720000000,
    position: 1,
    labels: [
      {
        object: 'projects.label',
        id: 'lbl_bug',
        tenantId: 'tenant_1',
        name: 'bug',
        color: '#e5484d',
        description: 'Crashes and broken behavior',
        createdAt: 1700000000,
        updatedAt: 1700000000,
      },
    ],
    commentCount: 1,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700050000,
    ...overrides,
  }
}

function makeEvent(overrides?: Partial<IssueEvent>): IssueEvent {
  return {
    object: 'projects.issue-event',
    id: 'event_1',
    issueId: 'issue_console_12',
    actorUserId: 'user_ben',
    type: 'status_changed',
    fromValue: 'todo',
    toValue: 'in-progress',
    createdAt: 1700020000,
    ...overrides,
  }
}

const statusEvent = makeEvent()
const systemEvent = makeEvent({
  id: 'event_2',
  actorUserId: null,
  type: 'comment_created',
  fromValue: null,
  toValue: null,
})

describe('IssueDetail', () => {
  afterEach(cleanup)

  it('header, on render, shows the issue identifier', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('CONSOLE-12')).toBeInTheDocument()
  })

  it('header, on render, shows the title as the top-level heading', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(
      screen.getByRole('heading', {
        name: 'Sidebar overlaps the editor on narrow screens',
      })
    ).toBeInTheDocument()
  })

  it('description, with a markdown heading, renders a heading element', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(
      screen.getByRole('heading', { name: 'Repro steps' })
    ).toBeInTheDocument()
  })

  it('description, with a markdown list, renders list items', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('Open the editor below 640px')).toBeInTheDocument()
    expect(screen.getByText('Toggle the sidebar')).toBeInTheDocument()
  })

  it('description, with inline code, renders code text without backticks', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('SidebarShell').tagName).toBe('CODE')
    expect(screen.queryByText(/`SidebarShell`/)).toBeNull()
  })

  it('description, with markdown source, leaves no literal heading markers', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.queryByText(/##\s+Repro/)).toBeNull()
  })

  it('description, on render, avoids a raw-text whitespace wrapper', () => {
    const { container } = render(<IssueDetail issue={makeIssue()} />)

    expect(container.querySelector('.whitespace-pre-wrap')).toBeNull()
  })

  it('description, when missing, shows the fallback text', () => {
    render(<IssueDetail issue={makeIssue({ description: null })} />)

    expect(screen.getByText('No description provided.')).toBeInTheDocument()
  })

  it('badges, on render, show the status text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('badges, on render, show the priority text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('assignee, when set, shows the assignee id', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('Assignee')).toBeInTheDocument()
    expect(screen.getByText('user_ana')).toBeInTheDocument()
  })

  it('assignee, when missing, shows the Unassigned fallback', () => {
    render(<IssueDetail issue={makeIssue({ assigneeUserId: null })} />)

    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('meta, on render, shows the estimate in points', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('3 pts')).toBeInTheDocument()
  })

  it('meta, without an estimate, shows an em dash for the estimate', () => {
    render(<IssueDetail issue={makeIssue({ estimate: null })} />)

    const label = screen.getByText('Estimate')
    const group = label.parentElement

    expect(group).not.toBeNull()
    expect(within(group as HTMLElement).getByText('—')).toBeInTheDocument()
  })

  it('project, with projectHref, links the project key to the href', () => {
    render(
      <IssueDetail
        issue={makeIssue()}
        projectHref="/orgs/acme/projects/CONSOLE"
      />
    )

    const link = screen.getByRole('link', { name: 'CONSOLE' })

    expect(link).toHaveAttribute('href', '/orgs/acme/projects/CONSOLE')
  })

  it('project, without projectHref, renders the project key as plain text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('CONSOLE')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('back navigation, on render, exposes no Back link', () => {
    render(
      <IssueDetail
        issue={makeIssue()}
        events={[statusEvent]}
        projectHref="/orgs/acme/projects/CONSOLE"
      />
    )

    expect(screen.queryByRole('link', { name: /back/i })).toBeNull()
  })

  it('activity, with events, lists each event actor and type', () => {
    render(<IssueDetail issue={makeIssue()} events={[statusEvent]} />)

    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('user_ben')).toBeInTheDocument()
    expect(screen.getByText('status_changed')).toBeInTheDocument()
  })

  it('activity, with a status change, shows the destination value', () => {
    render(<IssueDetail issue={makeIssue()} events={[statusEvent]} />)

    expect(screen.getByText(/in-progress/)).toBeInTheDocument()
  })

  it('activity, with a system event, falls back to System', () => {
    render(
      <IssueDetail issue={makeIssue()} events={[statusEvent, systemEvent]} />
    )

    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('comment_created')).toBeInTheDocument()
  })

  it('activity, without events, hides the Activity heading', () => {
    render(<IssueDetail issue={makeIssue()} events={[]} />)

    expect(screen.queryByText('Activity')).toBeNull()
  })
})
