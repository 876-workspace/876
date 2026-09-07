import type { CallToolResult } from '@modelcontextprotocol/server'

import type {
  Comment,
  Issue,
  IssueEventList,
  IssueList,
  Label,
  LabelList,
  MilestoneList,
  Project,
  ProjectList,
  Tenant,
  WorkflowStateList,
  WorkItemTypeList,
} from '@876/projects/contracts'

/**
 * The MCP SDK owns this contract, so it is aliased rather than restated.
 */
export type ToolResult = CallToolResult

export function formatDate(
  unixSeconds: number | null | undefined
): string | null {
  if (unixSeconds === null || unixSeconds === undefined) return null
  const date = new Date(unixSeconds * 1000)
  return date.toISOString().split('T')[0] ?? null
}

export function formatIssueLine(issue: Issue): string {
  const parts = [
    issue.identifier.padEnd(11),
    issue.status.padEnd(12),
    issue.priority.padEnd(8),
    issue.title,
  ]
  if (issue.assigneeUserId) {
    parts.push(`  @${issue.assigneeUserId}`)
  }
  if (issue.labels && issue.labels.length > 0) {
    parts.push(`  ${issue.labels.map((l) => `#${l.name}`).join(' ')}`)
  }
  return parts.join(' ')
}

export function formatIssueList(list: IssueList): string {
  if (list.data.length === 0) {
    return '0 issues found.'
  }
  const count = list.data.length
  const countLabel = `${count} issue${count === 1 ? '' : 's'}`
  const moreLabel = list.has_more
    ? ' (more available — raise limit or narrow the filter)'
    : ''
  const header = `${countLabel}${moreLabel}:`
  const lines = list.data.map(formatIssueLine)
  return [header, ...lines].join('\n')
}

export function formatIssue(issue: Issue): string {
  const lines: string[] = [
    `${issue.identifier}: ${issue.title}`,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority}`,
    `Project: ${issue.projectKey}`,
  ]
  if (issue.assigneeUserId) {
    lines.push(`Assignee: @${issue.assigneeUserId}`)
  }
  if (issue.creatorUserId) {
    lines.push(`Creator: @${issue.creatorUserId}`)
  }
  if (issue.parentIssueId) {
    lines.push(`Parent: ${issue.parentIssueId}`)
  }
  if (issue.labels && issue.labels.length > 0) {
    lines.push(`Labels: ${issue.labels.map((l) => l.name).join(', ')}`)
  }
  if (issue.estimate !== null && issue.estimate !== undefined) {
    lines.push(`Estimate: ${issue.estimate}`)
  }
  if (issue.dueDate !== null && issue.dueDate !== undefined) {
    const formatted = formatDate(issue.dueDate)
    if (formatted) lines.push(`Due Date: ${formatted}`)
  }
  if (issue.createdAt !== null && issue.createdAt !== undefined) {
    const formatted = formatDate(issue.createdAt)
    if (formatted) lines.push(`Created: ${formatted}`)
  }
  if (issue.updatedAt !== null && issue.updatedAt !== undefined) {
    const formatted = formatDate(issue.updatedAt)
    if (formatted) lines.push(`Updated: ${formatted}`)
  }
  if (issue.description) {
    lines.push(`\nDescription:\n${issue.description}`)
  }
  lines.push(`Comments: ${issue.commentCount}`)
  return lines.join('\n')
}

export function formatProject(project: Project): string {
  const lines: string[] = [
    `${project.key}: ${project.name}`,
    `Status: ${project.status}`,
    `Health: ${project.health}`,
  ]
  if (project.leadUserId) {
    lines.push(`Lead: @${project.leadUserId}`)
  }
  if (project.startDate !== null && project.startDate !== undefined) {
    const formatted = formatDate(project.startDate)
    if (formatted) lines.push(`Start Date: ${formatted}`)
  }
  if (project.targetDate !== null && project.targetDate !== undefined) {
    const formatted = formatDate(project.targetDate)
    if (formatted) lines.push(`Target Date: ${formatted}`)
  }
  if (project.description) {
    lines.push(`\nDescription:\n${project.description}`)
  }
  lines.push(`Members: ${project.memberCount}`)
  lines.push(`Next Issue Number: ${project.nextIssueNumber}`)
  if (project.createdAt !== null && project.createdAt !== undefined) {
    const formatted = formatDate(project.createdAt)
    if (formatted) lines.push(`Created: ${formatted}`)
  }
  if (project.updatedAt !== null && project.updatedAt !== undefined) {
    const formatted = formatDate(project.updatedAt)
    if (formatted) lines.push(`Updated: ${formatted}`)
  }
  return lines.join('\n')
}

export function formatProjectList(list: ProjectList): string {
  if (list.data.length === 0) {
    return '0 projects found.'
  }
  const count = list.data.length
  const countLabel = `${count} project${count === 1 ? '' : 's'}`
  const moreLabel = list.has_more
    ? ' (more available — raise limit or narrow the filter)'
    : ''
  const header = `${countLabel}${moreLabel}:`
  const lines = list.data.map((p) => {
    const parts = [
      p.key.padEnd(8),
      p.status.padEnd(10),
      p.health.padEnd(10),
      p.name,
    ]
    if (p.leadUserId) parts.push(`  @${p.leadUserId}`)
    if (p.targetDate !== null && p.targetDate !== undefined) {
      const formatted = formatDate(p.targetDate)
      if (formatted) parts.push(`  target:${formatted}`)
    }
    return parts.join(' ')
  })
  return [header, ...lines].join('\n')
}

export function formatWorkspace(
  tenant: Tenant,
  projectEntries: Array<{ project: Project; openIssueCount: number }>
): string {
  const lines: string[] = [
    `Tenant: ${tenant.organizationId} (ID: ${tenant.id})`,
    `Triage Project: ${tenant.triageProjectId ?? 'none'}`,
    `\nProjects (${projectEntries.length}):`,
  ]
  if (projectEntries.length === 0) {
    lines.push('  No projects found.')
  } else {
    for (const { project, openIssueCount } of projectEntries) {
      const parts = [
        project.key.padEnd(8),
        `status:${project.status.padEnd(10)}`,
        `health:${project.health.padEnd(10)}`,
        `open-issues:${openIssueCount}`,
        project.name,
      ]
      if (project.leadUserId) parts.push(`lead:@${project.leadUserId}`)
      if (project.targetDate !== null && project.targetDate !== undefined) {
        const formatted = formatDate(project.targetDate)
        if (formatted) parts.push(`target:${formatted}`)
      }
      lines.push(`  ${parts.join('  ')}`)
    }
  }
  return lines.join('\n')
}

export function formatComment(comment: Comment): string {
  const dateStr = formatDate(comment.createdAt)
  const authorStr = comment.authorUserId ? ` by @${comment.authorUserId}` : ''
  return `Comment on ${comment.issueId} (${dateStr}${authorStr}):\n${comment.body}`
}

export function formatComments(comments: readonly Comment[]): string {
  if (comments.length === 0) return '0 comments recorded.'
  return ['Comments:', ...comments.map(formatComment)].join('\n\n')
}

export function formatIssueEventList(list: IssueEventList): string {
  if (list.data.length === 0) {
    return '0 events recorded.'
  }
  const count = list.data.length
  const header = `${count} event${count === 1 ? '' : 's'}:`
  const lines = list.data.map((event) => {
    const dateStr = formatDate(event.createdAt)
    const actorStr = event.actorUserId ? ` by @${event.actorUserId}` : ''
    const changeStr =
      event.fromValue || event.toValue
        ? `: ${event.fromValue ?? 'none'} -> ${event.toValue ?? 'none'}`
        : ''
    return `[${dateStr}] ${event.type}${actorStr}${changeStr}`
  })
  return [header, ...lines].join('\n')
}

export function formatLabelList(list: LabelList): string {
  if (list.data.length === 0) {
    return '0 labels configured.'
  }
  const count = list.data.length
  const header = `${count} label${count === 1 ? '' : 's'}:`
  const lines = list.data.map((label) => {
    const desc = label.description ? ` - ${label.description}` : ''
    return `${label.name.padEnd(20)} ${label.color}${desc}`
  })
  return [header, ...lines].join('\n')
}

export function formatLabel(label: Label): string {
  const desc = label.description ? `\nDescription: ${label.description}` : ''
  return `Label: ${label.name} (${label.color})${desc}`
}

export function formatWorkItemTypeList(list: WorkItemTypeList): string {
  if (list.data.length === 0) return '0 work item types configured.'
  const count = list.data.length
  const header = `${count} work item type${count === 1 ? '' : 's'}:`
  const lines = list.data.map(
    (type) =>
      `${type.key.padEnd(20)} ${type.name}${type.isDefault ? ' (default)' : ''}`
  )
  return [header, ...lines].join('\n')
}

export function formatWorkflowStateList(list: WorkflowStateList): string {
  if (list.data.length === 0) return '0 workflow states configured.'
  const count = list.data.length
  const header = `${count} workflow state${count === 1 ? '' : 's'}:`
  const lines = list.data.map(
    (state) =>
      `${state.key.padEnd(20)} ${state.name} (${state.category})${state.isDefault ? ' (default)' : ''}`
  )
  return [header, ...lines].join('\n')
}

export function formatMilestoneList(list: MilestoneList): string {
  if (list.data.length === 0) return '0 milestones found.'
  const count = list.data.length
  const header = `${count} milestone${count === 1 ? '' : 's'}:`
  const lines = list.data.map((milestone) => {
    const targetDate = formatDate(milestone.targetDate)
    return `${milestone.key.padEnd(20)} ${milestone.status.padEnd(10)} ${milestone.name}${targetDate ? `  target:${targetDate}` : ''}`
  })
  return [header, ...lines].join('\n')
}

export function toolSuccess<T>(
  text: string,
  structuredContent: T
): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    structuredContent,
  }
}

export function toolError(
  error: { code: string; message: string } | string,
  message?: string
): CallToolResult {
  const code = typeof error === 'string' ? error : error.code
  const detail = typeof error === 'string' ? (message ?? error) : error.message
  const isUnexpected = code === 'internal/tool-error'
  const publicMessage = isUnexpected
    ? 'The Projects MCP tool failed unexpectedly. Check the server logs for details.'
    : detail

  if (isUnexpected) {
    console.error('876 Projects MCP unexpected tool error:', detail)
  }

  return {
    isError: true,
    content: [{ type: 'text', text: `Error [${code}]: ${publicMessage}` }],
  }
}
