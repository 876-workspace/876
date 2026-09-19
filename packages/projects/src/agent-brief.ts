import type { Comment, DevelopmentLink, Issue } from './contracts'

export type AgentBriefAttachment = {
  name: string
  contentType: string
  sizeBytes: number
}

export type AgentBriefLink = {
  relation: string
  identifier: string
  title: string
}

export type AgentBriefInput = {
  issue: Issue
  comments?: readonly Comment[]
  parentIssue?: Issue | null
  subIssues?: readonly Issue[]
  links?: readonly AgentBriefLink[]
  developmentLinks?: readonly DevelopmentLink[]
  attachments?: readonly AgentBriefAttachment[]
  projectName?: string | null
  assigneeLabel?: string | null
  phaseLabel?: string | null
  appOrigin?: string | null
  doneStatusKeys?: readonly string[]
}

function formatDate(unixSeconds: number | null | undefined): string {
  if (unixSeconds === null || unixSeconds === undefined) return '—'
  return new Date(unixSeconds * 1000).toISOString().split('T')[0] ?? '—'
}

function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ')
}

function display(value: string | null | undefined, fallback = '—'): string {
  return value && value.length > 0 ? value : fallback
}

function formatPriority(priority: Issue['priority']): string {
  return priority === 'none'
    ? 'None'
    : priority[0]?.toUpperCase() + priority.slice(1)
}

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  return `${Math.round(sizeBytes / 1024)} KB`
}

export function formatAgentPrompt(
  issue: Pick<Issue, 'identifier' | 'title'>
): string {
  return `Implement ${issue.identifier} (${issue.title}) from 876 Projects. Fetch the issue with the 876-projects MCP server before you start.`
}

export function formatAgentBrief(input: AgentBriefInput): string {
  const { issue } = input
  const project = input.projectName
    ? `${issue.projectKey} — ${input.projectName}`
    : issue.projectKey
  const rows = [
    ['Ref', issue.identifier],
    ['Project', project],
    ['Status', display(issue.state?.name, issue.status)],
    ['Type', display(issue.type?.name, issue.typeKey)],
    ['Priority', formatPriority(issue.priority)],
    ['Assignee', display(input.assigneeLabel, 'Unassigned')],
    ['Phase', display(input.phaseLabel)],
    [
      'Labels',
      issue.labels.length > 0
        ? issue.labels.map((label) => label.name).join(', ')
        : '—',
    ],
    ['Created', formatDate(issue.createdAt)],
    ['Updated', formatDate(issue.updatedAt)],
  ]
  if (input.appOrigin) {
    rows.push([
      'URL',
      `${input.appOrigin.replace(/\/$/, '')}/issues/${encodeURIComponent(issue.identifier)}`,
    ])
  }

  const sections = [
    `# ${issue.identifier} — ${issue.title}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...rows.map(([field, value]) => `| ${field} | ${value} |`),
    '',
    '## Description',
    '',
    issue.description ? issue.description : '_No description._',
  ]

  if (input.parentIssue) {
    sections.push(
      '',
      '## Parent',
      '',
      `${input.parentIssue.identifier} — ${input.parentIssue.title} (${input.parentIssue.state?.name ?? input.parentIssue.status})`
    )
  }
  if (input.subIssues && input.subIssues.length > 0) {
    const doneStatusKeys = new Set(input.doneStatusKeys ?? [])
    sections.push(
      '',
      '## Sub-issues',
      '',
      ...input.subIssues.map(
        (subIssue) =>
          `- [${doneStatusKeys.has(subIssue.status) ? 'x' : ' '}] ${subIssue.identifier} — ${subIssue.title} (${subIssue.state?.name ?? subIssue.status})`
      )
    )
  }
  if (input.links && input.links.length > 0) {
    sections.push(
      '',
      '## Links',
      '',
      ...input.links.map(
        (link) => `- ${link.relation} ${link.identifier} — ${link.title}`
      )
    )
  }
  if (input.developmentLinks && input.developmentLinks.length > 0) {
    sections.push(
      '',
      '## Development',
      '',
      ...input.developmentLinks.map(
        (link) =>
          `- ${link.kind}: ${link.label ?? link.url}${link.state ? ` (${link.state})` : ''}`
      )
    )
  }
  if (input.attachments && input.attachments.length > 0) {
    sections.push(
      '',
      '## Attachments',
      '',
      ...input.attachments.map(
        (attachment) =>
          `- ${attachment.name} — ${attachment.contentType}, ${formatSize(attachment.sizeBytes)}`
      )
    )
  }

  const comments = [...(input.comments ?? [])].sort(
    (left, right) => left.createdAt - right.createdAt
  )
  sections.push('', `## Comments (${comments.length})`, '')
  if (comments.length === 0) {
    sections.push('_None._')
  } else {
    for (const comment of comments) {
      sections.push(
        `### @${comment.authorUserId ?? 'unknown'} — ${formatDateTime(comment.createdAt)}`,
        '',
        comment.body,
        ''
      )
    }
    sections.pop()
  }

  sections.push(
    '',
    '---',
    '',
    'Generated from 876 Projects. Re-read the live record with the `876-projects`',
    `MCP server: \`issue_brief\` with ref \`${issue.identifier}\`.`
  )
  return sections.join('\n')
}
