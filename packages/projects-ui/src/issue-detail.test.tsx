// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Issue, IssueEvent } from '@876/projects/contracts'

import {
  IssueDetail,
  IssueDetailBody,
  IssueDetailHeader,
  IssueMetaRail,
} from './issue-detail'

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task_1',
  tenantId: 'tenant_1',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

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
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_ana',
    creatorUserId: 'user_ben',
    parentIssueId: null,
    taskListId: null,
    cycleId: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
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

    expect(screen.getByText('CONSOLE · CONSOLE-12')).toBeInTheDocument()
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

    expect(
      screen.getByText('No description has been added to this issue.')
    ).toBeInTheDocument()
  })

  it('badges, on render, show the status text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getAllByText('In Progress')).toHaveLength(2)
  })

  it('badges, on render, show the priority text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getAllByText('High')).toHaveLength(2)
  })

  it('assignee, when set, shows the assignee id', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getAllByText('Assignee')).toHaveLength(2)
    expect(screen.getAllByText('user_ana')).toHaveLength(2)
  })

  it('assignee, when missing, shows the clean empty state', () => {
    render(<IssueDetail issue={makeIssue({ assigneeUserId: null })} />)

    expect(screen.getAllByText('Not assigned')).toHaveLength(2)
  })

  it('meta, on render, shows the estimate in points', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getAllByText('3 points')).toHaveLength(2)
  })

  it('meta, without an estimate, names the empty estimate state', () => {
    render(<IssueDetail issue={makeIssue({ estimate: null })} />)

    expect(screen.getAllByText('No estimate')).toHaveLength(2)
  })

  it('project, with projectHref, links the project key to the href', () => {
    render(
      <IssueDetail
        issue={makeIssue()}
        projectHref="/orgs/acme/projects/CONSOLE"
      />
    )

    const link = screen.getAllByRole('link', { name: 'CONSOLE' })[0]

    expect(link).toHaveAttribute('href', '/orgs/acme/projects/CONSOLE')
  })

  it('project, without projectHref, renders the project key as plain text', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getAllByText('CONSOLE')).toHaveLength(2)
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

    expect(screen.getAllByText('Activity')).toHaveLength(2)
    expect(screen.getAllByText('user_ben').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Status Changed')).toHaveLength(2)
  })

  it('activity, with a status change, shows the destination value', () => {
    render(<IssueDetail issue={makeIssue()} events={[statusEvent]} />)

    expect(screen.getAllByText(/in-progress/).length).toBeGreaterThan(1)
  })

  it('activity, with a system event, falls back to System', () => {
    render(
      <IssueDetail issue={makeIssue()} events={[statusEvent, systemEvent]} />
    )

    expect(screen.getAllByText('System')).toHaveLength(2)
    expect(screen.getAllByText('Comment Created')).toHaveLength(2)
  })

  it('activity, without events, shows an explicit empty state', () => {
    render(<IssueDetail issue={makeIssue()} events={[]} />)

    expect(screen.getAllByText('Activity')).toHaveLength(2)
    expect(screen.getAllByText('No activity yet.')).toHaveLength(1)
  })

  it('record header, on render, identifies the parent project and issue key', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('CONSOLE · CONSOLE-12')).toBeInTheDocument()
  })

  it('body, on render, labels the readable description section', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(
      screen.getByRole('heading', { name: 'Description' })
    ).toBeInTheDocument()
  })

  it('facts, without an assignee, use the clean unassigned state', () => {
    render(<IssueDetail issue={makeIssue({ assigneeUserId: null })} />)

    expect(screen.getAllByText('Not assigned')).toHaveLength(2)
  })

  it('facts, without a due date, use the clean empty state', () => {
    render(<IssueDetail issue={makeIssue({ dueDate: null })} />)

    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('facts, without an estimate, use the clean empty state', () => {
    render(<IssueDetail issue={makeIssue({ estimate: null })} />)

    expect(screen.getAllByText('No estimate')).toHaveLength(2)
  })

  it('activity, with events, renders a timeline list', () => {
    render(<IssueDetail issue={makeIssue()} events={[statusEvent]} />)

    expect(
      screen.getAllByRole('list', { name: 'Activity timeline' })
    ).toHaveLength(2)
  })

  it('facts, on render, are grouped under the Details heading', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument()
  })
})

describe('Issue detail composition', () => {
  afterEach(cleanup)

  it('renders the header identifier and title', () => {
    render(<IssueDetailHeader issue={makeIssue()} />)

    expect(screen.getByText('CONSOLE · CONSOLE-12')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Sidebar overlaps the editor on narrow screens',
      })
    ).toBeInTheDocument()
  })

  it('renders the header actions slot', () => {
    render(
      <IssueDetailHeader
        issue={makeIssue()}
        actions={<span>Follow this issue</span>}
      />
    )

    expect(screen.getByText('Follow this issue')).toBeInTheDocument()
  })

  it('omits the header Blocked badge when the issue is not blocked', () => {
    render(<IssueDetailHeader issue={makeIssue({ blocked: false })} />)

    expect(screen.queryByText('Blocked')).toBeNull()
  })

  it('renders markdown description content in the body', () => {
    render(<IssueDetailBody issue={makeIssue()} />)

    expect(
      screen.getByRole('heading', { name: 'Repro steps' })
    ).toBeInTheDocument()
    expect(screen.getByText('SidebarShell').tagName).toBe('CODE')
  })

  it('renders the empty-description state in the body', () => {
    render(<IssueDetailBody issue={makeIssue({ description: null })} />)

    expect(
      screen.getByText('No description has been added to this issue.')
    ).toBeInTheDocument()
  })

  it('renders the assignee label from userLabels in the meta rail', () => {
    render(
      <IssueMetaRail
        issue={makeIssue()}
        userLabels={{ user_ana: 'Ana Brown' }}
      />
    )

    expect(screen.getAllByText('Ana Brown')).toHaveLength(2)
  })

  it('renders Not assigned for a null assignee in the meta rail', () => {
    render(<IssueMetaRail issue={makeIssue({ assigneeUserId: null })} />)

    expect(screen.getAllByText('Not assigned')).toHaveLength(2)
  })

  it('formats custom field values in the meta rail', () => {
    render(
      <IssueMetaRail
        issue={makeIssue({
          customFields: [
            {
              object: 'projects.custom-field-value',
              id: 'value_1',
              tenantId: 'tenant_1',
              issueId: 'issue_console_12',
              fieldId: 'field_1',
              fieldKey: 'release',
              fieldType: 'checkbox',
              value: true,
              updatedBy: null,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        })}
        customFields={[
          {
            object: 'projects.custom-field',
            id: 'field_1',
            tenantId: 'tenant_1',
            key: 'release',
            label: 'Release ready',
            fieldType: 'checkbox',
            options: [],
            required: false,
            description: null,
            position: 0,
            typeIds: [],
            archivedAt: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
      />
    )

    expect(screen.getAllByText('Release ready')).toHaveLength(2)
    expect(screen.getAllByText('Yes')).toHaveLength(2)
  })

  it('renders Not set for an empty custom field', () => {
    render(
      <IssueMetaRail
        issue={makeIssue({
          customFields: [
            {
              object: 'projects.custom-field-value',
              id: 'value_1',
              tenantId: 'tenant_1',
              issueId: 'issue_console_12',
              fieldId: 'field_1',
              fieldKey: 'release',
              fieldType: 'text',
              value: '',
              updatedBy: null,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        })}
      />
    )

    expect(screen.getAllByText('Not set')).toHaveLength(2)
  })

  it('renders sub-issues as links to their identifiers', () => {
    render(
      <IssueDetailBody
        issue={makeIssue({ subIssueCount: 1 })}
        issuesHref="/issues"
        subIssues={[
          makeIssue({
            id: 'sub_1',
            identifier: 'CONSOLE-13',
            title: 'Child issue',
          }),
        ]}
      />
    )

    expect(
      screen.getAllByRole('link', { name: 'Child issue' })[0]
    ).toHaveAttribute('href', '/issues/CONSOLE-13')
    expect(screen.getAllByText('CONSOLE-13')).toHaveLength(3)
  })

  it('renders a parent issue when present and omits its link when null', () => {
    const { rerender } = render(
      <IssueDetailBody
        issue={makeIssue({ parentIssueId: 'parent_1' })}
        parentIssue={makeIssue({
          id: 'parent_1',
          identifier: 'CONSOLE-1',
          title: 'Parent issue',
        })}
        issuesHref="/issues"
      />
    )

    expect(
      screen.getAllByRole('link', { name: /CONSOLE-1.*Parent issue/ })[0]
    ).toHaveAttribute('href', '/issues/CONSOLE-1')

    rerender(<IssueDetailBody issue={makeIssue({ parentIssueId: null })} />)

    expect(screen.queryByRole('link', { name: /CONSOLE-1/ })).toBeNull()
    expect(screen.getByText('No parent')).toBeInTheDocument()
  })

  it('renders events in a disclosure capped to the newest five', () => {
    const events = Array.from({ length: 6 }, (_, index) =>
      makeEvent({
        id: `event_${index}`,
        type: `event_${index}`,
        createdAt: index,
      })
    )
    const { container } = render(
      <IssueDetailBody issue={makeIssue()} events={events} />
    )
    const disclosure = container.querySelector('details')

    expect(disclosure).not.toBeNull()
    expect(
      within(disclosure as HTMLDetailsElement).getByText('Event 4')
    ).toBeInTheDocument()
    expect(
      within(disclosure as HTMLDetailsElement).queryByText('Event 5')
    ).toBeNull()
  })

  it('composes the header body and rail for back-compatible IssueDetail callers', () => {
    render(<IssueDetail issue={makeIssue()} />)

    expect(screen.getByText('CONSOLE · CONSOLE-12')).toBeInTheDocument()
    expect(screen.getAllByText('Description')).toHaveLength(2)
    expect(screen.getAllByText('Details')).toHaveLength(2)
  })

  it('renders no lg right-margin alignment class', () => {
    const { container } = render(<IssueDetail issue={makeIssue()} />)

    expect(
      [...container.querySelectorAll('*')].some((element) =>
        element.className.toString().includes('lg:mr-')
      )
    ).toBe(false)
  })
})
