import type { CallToolResult } from '@modelcontextprotocol/server'

import type {
  BudgetVarianceReport,
  Comment,
  CustomModule,
  CustomRecord,
  Cycle,
  HealthReport,
  Issue,
  IssueEventList,
  IssueList,
  Label,
  LabelList,
  MilestoneList,
  Project,
  ProjectList,
  ProjectTemplate,
  TaskList,
  Tenant,
  TimeEntry,
  TimeReport,
  TimeSummary,
  WorkloadReport,
  WorkReport,
  WorkflowStateList,
  WorkItemTypeList,
} from '@876/projects/contracts'
import type { ActivityFeed, ActivityItem, WikiPage } from '@876/projects'
import type { MilestoneDetail } from '@876/projects/contracts'

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

export function formatPhase(phase: MilestoneDetail): string {
  const lines: string[] = [`${phase.key}: ${phase.name}`, `Status: ${phase.status}`]
  if (phase.description) {
    lines.push(`\nDescription:\n${phase.description}`)
  }
  const targetDate = formatDate(phase.targetDate)
  if (targetDate) lines.push(`Target Date: ${targetDate}`)
  const startDate = formatDate(phase.startDate)
  if (startDate) lines.push(`Start Date: ${startDate}`)
  if (phase.ownerUserId) lines.push(`Owner: @${phase.ownerUserId}`)
  return lines.join('\n')
}

export function formatPhaseList(phases: readonly MilestoneDetail[]): string {
  if (phases.length === 0) return '0 phases found.'
  const header = `${phases.length} phase${phases.length === 1 ? '' : 's'}:`
  const lines = phases.map((phase) => {
    const targetDate = formatDate(phase.targetDate)
    return `${phase.key.padEnd(20)} ${phase.status.padEnd(10)} ${phase.name}${targetDate ? `  target:${targetDate}` : ''}`
  })
  return [header, ...lines].join('\n')
}

export function formatCycle(cycle: Cycle): string {
  const lines: string[] = [
    `${cycle.name} (#${cycle.number})`,
    `Status: ${cycle.status}`,
  ]
  const startsAt = formatDate(cycle.startsAt)
  if (startsAt) lines.push(`Starts: ${startsAt}`)
  const endsAt = formatDate(cycle.endsAt)
  if (endsAt) lines.push(`Ends: ${endsAt}`)
  if (cycle.goal) lines.push(`\nGoal:\n${cycle.goal}`)
  if (cycle.description) lines.push(`\nDescription:\n${cycle.description}`)
  lines.push(
    `Progress: ${cycle.progress.completed}/${cycle.progress.total} items (${cycle.progress.completedEstimatePoints}/${cycle.progress.estimatePoints} pts)`
  )
  return lines.join('\n')
}

export function formatCycleList(cycles: readonly Cycle[]): string {
  if (cycles.length === 0) return '0 cycles found.'
  const header = `${cycles.length} cycle${cycles.length === 1 ? '' : 's'}:`
  const lines = cycles.map((cycle) => {
    const endsAt = formatDate(cycle.endsAt)
    return `${cycle.name.padEnd(24)} ${cycle.status.padEnd(10)} #${cycle.number}${endsAt ? `  ends:${endsAt}` : ''}`
  })
  return [header, ...lines].join('\n')
}

export function formatTaskList(taskList: TaskList): string {
  const lines: string[] = [taskList.name, `Progress: ${taskList.progress.completed}/${taskList.progress.total}`]
  if (taskList.description) lines.push(`\nDescription:\n${taskList.description}`)
  if (taskList.ownerUserId) lines.push(`Owner: @${taskList.ownerUserId}`)
  const targetDate = formatDate(taskList.targetDate)
  if (targetDate) lines.push(`Target Date: ${targetDate}`)
  return lines.join('\n')
}

export function formatTaskListList(taskLists: readonly TaskList[]): string {
  if (taskLists.length === 0) return '0 task lists found.'
  const header = `${taskLists.length} task list${taskLists.length === 1 ? '' : 's'}:`
  const lines = taskLists.map(
    (taskList) => `${taskList.name.padEnd(28)} ${taskList.progress.completed}/${taskList.progress.total} items`
  )
  return [header, ...lines].join('\n')
}

export function formatTimeEntry(entry: TimeEntry): string {
  const parts = [`Time entry ${entry.id}`, `Project: ${entry.projectId}`]
  if (entry.issueId) parts.push(`Issue: ${entry.issueId}`)
  parts.push(`User: @${entry.userId}`)
  const started = formatDate(entry.startedAt)
  if (started) parts.push(`Started: ${started}`)
  if (entry.durationMinutes !== null && entry.durationMinutes !== undefined) {
    parts.push(`Duration: ${entry.durationMinutes}m`)
  }
  parts.push(`Billable: ${entry.billable ? 'yes' : 'no'}`)
  parts.push(`Approval: ${entry.approvalStatus}`)
  if (entry.note) parts.push(`\nNote:\n${entry.note}`)
  return parts.join('\n')
}

export function formatTimeEntryList(entries: readonly TimeEntry[]): string {
  if (entries.length === 0) return '0 time entries found.'
  const header = `${entries.length} time entr${entries.length === 1 ? 'y' : 'ies'}:`
  const lines = entries.map((entry) => {
    const started = formatDate(entry.startedAt)
    const duration = entry.durationMinutes !== null && entry.durationMinutes !== undefined ? ` ${entry.durationMinutes}m` : ''
    return `${entry.id.padEnd(16)} @${entry.userId.padEnd(16)} ${entry.projectId}${duration}${started ? `  ${started}` : ''}`
  })
  return [header, ...lines].join('\n')
}

export function formatTimeSummary(summary: TimeSummary): string {
  const lines: string[] = [`Time summary by ${summary.groupBy}:`]
  if (summary.groups.length === 0) {
    lines.push('  No time recorded.')
  } else {
    for (const group of summary.groups) {
      lines.push(`  ${(group.key ?? 'unassigned').padEnd(20)} ${group.totalMinutes}m (${group.entryCount} entries)`)
    }
  }
  lines.push(`Total: ${summary.totals.totalMinutes}m across ${summary.totals.entryCount} entries`)
  return lines.join('\n')
}

export function formatWorkReport(report: WorkReport): string {
  const lines: string[] = [`Work report: ${report.total} items (${report.overdue} overdue)`]
  if (report.byState.length > 0) {
    lines.push('By state:')
    for (const row of report.byState) lines.push(`  ${row.key.padEnd(20)} ${row.count}`)
  }
  if (report.byType.length > 0) {
    lines.push('By type:')
    for (const row of report.byType) lines.push(`  ${row.key.padEnd(20)} ${row.count}`)
  }
  if (report.byAssignee.length > 0) {
    lines.push('By assignee:')
    for (const row of report.byAssignee) lines.push(`  ${(row.key || 'unassigned').padEnd(20)} ${row.count}`)
  }
  return lines.join('\n')
}

export function formatHealthReport(report: HealthReport): string {
  if (report.data.length === 0) return '0 projects in the health report.'
  const header = `${report.data.length} project${report.data.length === 1 ? '' : 's'}:`
  const lines = report.data.map(
    (row) => `${row.name.padEnd(24)} ${row.health.padEnd(10)} open:${row.openItems} overdue:${row.overdue}`
  )
  return [header, ...lines].join('\n')
}

export function formatTimeReport(report: TimeReport): string {
  const lines: string[] = [`Time report by ${report.groupBy}:`]
  if (report.data.length === 0) {
    lines.push('  No time recorded.')
  } else {
    for (const row of report.data) {
      lines.push(`  ${row.key.padEnd(20)} billable:${row.billableMinutes}m non-billable:${row.nonBillableMinutes}m`)
    }
  }
  return lines.join('\n')
}

export function formatBudgetVarianceReport(report: BudgetVarianceReport): string {
  if (report.data.length === 0) return '0 projects in the budget variance report.'
  const header = `${report.data.length} project${report.data.length === 1 ? '' : 's'}:`
  const lines = report.data.map(
    (row) => `${row.name.padEnd(24)} actual:${row.actualMinutes}m`
  )
  return [header, ...lines].join('\n')
}

export function formatWorkloadReport(report: WorkloadReport): string {
  if (report.data.length === 0) return '0 members in the workload report.'
  const header = `${report.data.length} member${report.data.length === 1 ? '' : 's'}:`
  const lines = report.data.map(
    (row) => `@${row.userId.padEnd(18)} open:${row.assignedOpenItems} logged:${row.loggedMinutes}m planned:${row.plannedMinutes}m`
  )
  return [header, ...lines].join('\n')
}

export function formatProjectTemplate(template: ProjectTemplate): string {
  const lines: string[] = [`${template.key}: ${template.name}`, `Version: ${template.currentVersion}`]
  if (template.description) lines.push(`\nDescription:\n${template.description}`)
  lines.push(
    `Counts: ${template.counts.phases} phases, ${template.counts.taskLists} task lists, ${template.counts.workItems} work items`
  )
  return lines.join('\n')
}

export function formatProjectTemplateList(templates: readonly ProjectTemplate[]): string {
  if (templates.length === 0) return '0 templates found.'
  const header = `${templates.length} template${templates.length === 1 ? '' : 's'}:`
  const lines = templates.map((template) => `${template.key.padEnd(20)} v${template.currentVersion}  ${template.name}`)
  return [header, ...lines].join('\n')
}

export function formatCustomModuleList(modules: readonly CustomModule[]): string {
  if (modules.length === 0) return '0 custom modules configured.'
  const header = `${modules.length} custom module${modules.length === 1 ? '' : 's'}:`
  const lines = modules.map((module) => `${module.key.padEnd(20)} ${module.pluralName}`)
  return [header, ...lines].join('\n')
}

export function formatCustomRecord(record: CustomRecord): string {
  const lines: string[] = [`${record.title}`, `Status: ${record.statusKey}`]
  const fieldKeys = Object.keys(record.fields)
  if (fieldKeys.length > 0) {
    lines.push(`Fields: ${fieldKeys.length}`)
  }
  return lines.join('\n')
}

export function formatCustomRecordList(records: readonly CustomRecord[]): string {
  if (records.length === 0) return '0 records found.'
  const header = `${records.length} record${records.length === 1 ? '' : 's'}:`
  const lines = records.map((record) => `${record.id.padEnd(16)} ${record.statusKey.padEnd(14)} ${record.title}`)
  return [header, ...lines].join('\n')
}

export function formatActivityFeed(feed: ActivityFeed): string {
  if (feed.items.length === 0) return '0 activity items recorded.'
  const header = `${feed.items.length} activit${feed.items.length === 1 ? 'y item' : 'y items'}:`
  const lines = feed.items.map((item: ActivityItem) => formatActivityItem(item))
  return [header, ...lines].join('\n')
}

export function formatActivityItem(item: ActivityItem): string {
  const dateStr = formatDate(item.createdAt)
  const actorStr = item.actorUserId ? ` by @${item.actorUserId}` : ''
  const changeStr = item.fromValue || item.toValue ? `: ${item.fromValue ?? 'none'} -> ${item.toValue ?? 'none'}` : ''
  return `[${dateStr}] ${item.type}${actorStr}${changeStr}`
}

export function formatWikiPage(page: WikiPage): string {
  const lines: string[] = [page.title, `Slug: ${page.slug}`]
  if (page.body) lines.push(`\n${page.body}`)
  lines.push(`Revisions: ${page.revisionCount}`)
  return lines.join('\n')
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
