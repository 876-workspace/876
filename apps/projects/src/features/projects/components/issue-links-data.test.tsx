/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { Issue } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  listRelations: vi.fn(),
  listDependencies: vi.fn(),
  panel: vi.fn(),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: { retrieve: mocks.retrieve },
    issueRelations: { list: mocks.listRelations },
    issueDependencies: { list: mocks.listDependencies },
  },
}))

vi.mock('@/features/projects/components/issue-links-panel', () => ({
  IssueLinksPanel: (props: Record<string, unknown>) => {
    mocks.panel(props)
    return <div>Links panel</div>
  },
}))

import { IssueLinksData } from './issue-links-data'

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'iss_2',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    projectKey: 'CONSOLE',
    number: 2,
    identifier: 'CONSOLE-2',
    title: 'Verify the release',
    description: null,
    status: 'todo',
    typeKey: 'task',
    type: null,
    state: null,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'none',
    assigneeUserId: null,
    creatorUserId: null,
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
    position: 0,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

const selfIssue = makeIssue()
const releaseIssue = makeIssue({
  id: 'iss_1',
  number: 1,
  identifier: 'CONSOLE-1',
  title: 'Ship the release',
})
const migrationIssue = makeIssue({
  id: 'iss_3',
  number: 3,
  identifier: 'CONSOLE-3',
  title: 'Write the migration',
})

const relation = {
  object: 'issue-relation',
  id: 'isr_1',
  tenantId: 'tnt_1',
  sourceIssueId: 'iss_2',
  targetIssueId: 'iss_1',
  type: 'relates-to',
  createdBy: 'usr_1',
  createdAt: 1788400000,
}

const predecessor = {
  object: 'issue-dependency',
  id: 'isd_1',
  tenantId: 'tnt_1',
  predecessorIssueId: 'iss_3',
  successorIssueId: 'iss_2',
  type: 'finish-to-start',
  lagMinutes: 60,
  createdBy: 'usr_1',
  createdAt: 1788400000,
}

const successor = {
  ...predecessor,
  id: 'isd_2',
  predecessorIssueId: 'iss_2',
  successorIssueId: 'iss_1',
  type: 'start-to-start',
  lagMinutes: -30,
}

function panelProps() {
  return mocks.panel.mock.calls[0][0] as Record<string, unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieve.mockImplementation(async (_orgId: string, ref: string) => {
    const found = [selfIssue, releaseIssue, migrationIssue].find(
      (issue) => issue.id === ref || issue.identifier === ref
    )
    return found
      ? { data: found, error: null }
      : {
          data: null,
          error: {
            code: 'projects/issue-not-found',
            message: 'That work item does not exist.',
          },
        }
  })
  mocks.listRelations.mockResolvedValue({
    data: { data: [relation] },
    error: null,
  })
  mocks.listDependencies.mockResolvedValue({
    data: { predecessors: [predecessor], successors: [successor] },
    error: null,
  })
})

describe('IssueLinksData', () => {
  it('resolves the work item at the other end of each link', async () => {
    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'iss_1')
    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'iss_3')
    expect(panelProps().relations).toEqual([
      {
        id: 'isr_1',
        type: 'relates-to',
        direction: 'outgoing',
        item: {
          id: 'iss_1',
          identifier: 'CONSOLE-1',
          title: 'Ship the release',
        },
      },
    ])
  })

  it('reads dependencies as predecessors and successors with their lag', async () => {
    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps().dependencies).toEqual([
      {
        id: 'isd_1',
        role: 'predecessor',
        type: 'finish-to-start',
        lagMinutes: 60,
        item: {
          id: 'iss_3',
          identifier: 'CONSOLE-3',
          title: 'Write the migration',
        },
      },
      {
        id: 'isd_2',
        role: 'successor',
        type: 'start-to-start',
        lagMinutes: -30,
        item: {
          id: 'iss_1',
          identifier: 'CONSOLE-1',
          title: 'Ship the release',
        },
      },
    ])
  })

  it('reads a blocks relationship from the receiving side as incoming', async () => {
    mocks.listRelations.mockResolvedValue({
      data: {
        data: [{ ...relation, sourceIssueId: 'iss_1', targetIssueId: 'iss_2' }],
      },
      error: null,
    })

    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps().relations).toEqual([
      expect.objectContaining({ direction: 'incoming' }),
    ])
  })

  it('scopes the pickers to the project the work item belongs to', async () => {
    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps().projectId).toBe('prj_1')
  })

  it('no longer preloads a window of the tenant for the pickers', async () => {
    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps()).not.toHaveProperty('candidates')
  })

  it('hands the planned schedule of the work item to the panel', async () => {
    mocks.retrieve.mockImplementation(async () => ({
      data: makeIssue({
        plannedStartDate: 1788480000,
        plannedFinishDate: 1788825600,
        plannedDurationMinutes: 240,
      }),
      error: null,
    }))

    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps()).toMatchObject({
      issueRef: 'CONSOLE-2',
      plannedStartDate: 1788480000,
      plannedFinishDate: 1788825600,
      plannedDurationMinutes: 240,
    })
  })

  it('keeps a link row when its other end can no longer be read', async () => {
    mocks.retrieve.mockImplementation(async (_orgId: string, ref: string) =>
      ref === 'iss_1'
        ? {
            data: null,
            error: {
              code: 'projects/issue-not-found',
              message: 'That work item does not exist.',
            },
          }
        : { data: selfIssue, error: null }
    )

    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(panelProps().relations).toEqual([
      expect.objectContaining({
        item: {
          id: 'iss_1',
          identifier: 'iss_1',
          title: 'Work item unavailable',
        },
      }),
    ])
  })

  it('shows the failure instead of an empty panel when a link read fails', async () => {
    mocks.listDependencies.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/links-unavailable',
        message: 'The links could not be loaded.',
      },
    })

    render(await IssueLinksData({ orgId: 'org_1', issueRef: 'CONSOLE-2' }))

    expect(
      screen.getByText('Work item links could not be loaded')
    ).toBeInTheDocument()
    expect(mocks.panel).not.toHaveBeenCalled()
  })
})
