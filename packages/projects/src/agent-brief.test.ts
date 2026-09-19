import type { Comment, Issue } from './contracts'
import { describe, expect, it } from 'vitest'
import {
  formatAgentBrief,
  formatAgentPrompt,
  type AgentBriefInput,
} from './agent-brief'

const issue: Issue = {
  object: 'projects.issue',
  id: 'iss_100',
  tenantId: 'ten_1',
  projectId: 'prj_bill',
  projectKey: 'BILL',
  number: 100,
  identifier: 'BILL-100',
  title: 'Storage-backed images for billing plans',
  description: '**Keep this markdown.**\n\n- exactly',
  status: 'todo',
  typeKey: 'feature',
  type: {
    object: 'projects.work-item-type',
    id: 'type_1',
    tenantId: 'ten_1',
    key: 'feature',
    name: 'Feature',
    iconKey: 'star',
    color: '#000',
    hierarchyLevel: 1,
    description: null,
    isDefault: true,
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
  },
  state: {
    object: 'projects.workflow-state',
    id: 'state_1',
    tenantId: 'ten_1',
    key: 'todo',
    name: 'Todo',
    category: 'unstarted',
    color: '#000',
    description: null,
    isDefault: true,
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
  },
  milestone: null,
  taskListId: null,
  cycleId: null,
  customFields: [],
  priority: 'none',
  assigneeUserId: null,
  creatorUserId: 'usr_1',
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
  labels: [
    {
      object: 'projects.label',
      id: 'lbl_1',
      tenantId: 'ten_1',
      name: 'feature',
      color: '#000',
      description: null,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  commentCount: 0,
  subIssueCount: 0,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  createdAt: 1789776000,
  updatedAt: 1789776000,
}

const comment = (id: string, createdAt: number, body: string): Comment => ({
  object: 'projects.comment',
  id,
  tenantId: 'ten_1',
  issueId: issue.id,
  authorUserId: 'raheem',
  body,
  createdAt,
  updatedAt: createdAt,
})
const brief = (input: Partial<AgentBriefInput> = {}) =>
  formatAgentBrief({ ...input, issue: input.issue ?? issue })

describe('formatAgentBrief', () => {
  it('renders the title line with ref and title', () =>
    expect(brief()).toMatch(
      /^# BILL-100 — Storage-backed images for billing plans/m
    ))
  it('renders every metadata row', () =>
    expect(
      brief({
        projectName: '876 Billing',
        appOrigin: 'https://876-projects.vercel.app',
      })
    ).toContain('| URL | https://876-projects.vercel.app/issues/BILL-100 |'))
  it('renders dashes for null optional metadata', () =>
    expect(brief()).toContain('| Phase | — |'))
  it('omits the URL row without an app origin', () =>
    expect(brief()).not.toContain('| URL |'))
  it('includes the URL row with an app origin', () =>
    expect(brief({ appOrigin: 'https://example.test/' })).toContain(
      '| URL | https://example.test/issues/BILL-100 |'
    ))
  it('renders the description verbatim', () =>
    expect(brief()).toContain('**Keep this markdown.**\n\n- exactly'))
  it('renders no description for null descriptions', () =>
    expect(brief({ issue: { ...issue, description: null } })).toContain(
      '_No description._'
    ))
  it('renders no description for empty descriptions', () =>
    expect(brief({ issue: { ...issue, description: '' } })).toContain(
      '_No description._'
    ))
  it('omits parent when absent', () =>
    expect(brief()).not.toContain('## Parent'))
  it('renders a parent line', () =>
    expect(
      brief({
        parentIssue: {
          ...issue,
          identifier: 'PROJ-12',
          title: 'Parent title',
          status: 'in-progress',
          state: { ...issue.state!, name: 'In progress' },
        },
      })
    ).toContain('PROJ-12 — Parent title (In progress)'))
  it('omits empty sub-issues', () =>
    expect(brief({ subIssues: [] })).not.toContain('## Sub-issues'))
  it('checks done sub-issues from configured keys', () =>
    expect(
      brief({
        subIssues: [{ ...issue, identifier: 'BILL-101', status: 'done' }],
        doneStatusKeys: ['done'],
      })
    ).toContain('- [x] BILL-101'))
  it('leaves unconfigured sub-issues unchecked', () =>
    expect(
      brief({
        subIssues: [{ ...issue, identifier: 'BILL-101', status: 'done' }],
      })
    ).toContain('- [ ] BILL-101'))
  it('omits empty links and attachments', () =>
    expect(brief({ links: [], attachments: [] })).not.toMatch(
      /## (Links|Attachments)/
    ))
  it('renders a zero-comment heading and none marker', () =>
    expect(brief()).toContain('## Comments (0)\n\n_None._'))
  it('sorts comments oldest first', () => {
    const output = brief({
      comments: [
        comment('new', 1789780580, 'new'),
        comment('old', 1789778520, 'old'),
      ],
    })
    expect(output.indexOf('old')).toBeLessThan(output.indexOf('new'))
  })
  it('passes comment bodies through verbatim', () =>
    expect(
      brief({ comments: [comment('cmt_1', 1789778520, '`exact`\n\n- body')] })
    ).toContain('`exact`\n\n- body'))
  it('names the tool and ref in the footer', () =>
    expect(brief()).toContain('MCP server: `issue_brief` with ref `BILL-100`.'))
  it('is deterministic', () =>
    expect(brief({ comments: [comment('cmt_1', 1, 'body')] })).toBe(
      brief({ comments: [comment('cmt_1', 1, 'body')] })
    ))
  it('formats the agent pointer prompt exactly', () =>
    expect(formatAgentPrompt(issue)).toBe(
      'Implement BILL-100 (Storage-backed images for billing plans) from 876 Projects. Fetch the issue with the 876-projects MCP server before you start.'
    ))
})
