import { getError, type ProjectsError } from '../../http/errors.js'
import * as tenants from '../tenants/index.js'
import * as repository from './gantt.repository.js'
import { computeCriticalPath } from './gantt.scheduling.js'
import type { GanttQuery } from './gantt.schemas.js'
import {
  actualFinishFor,
  issueActualStart,
  issuePlannedFinish,
  issuePlannedStart,
  percentCompleteForStatus,
  phaseRowId,
  serializeGanttEdge,
  subItemRowId,
  taskListRowId,
  workItemRowId,
  type GanttIssueRow,
  type SerializedGantt,
  type SerializedGanttRow,
} from './gantt.serializers.js'
import { resolveProject } from './projects.service.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function percentForIssues(issues: GanttIssueRow[]): number {
  if (issues.length === 0) return 0
  let done = 0
  for (const issue of issues) {
    if (issue.status === 'done' || issue.status === 'canceled') done += 1
  }
  return Math.round((done / issues.length) * 100)
}

export async function getGantt(
  organizationId: string,
  projectIdOrKey: string,
  query: GanttQuery
): Promise<ServiceResult<SerializedGantt>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id

  const project = await resolveProject(tenantId, projectIdOrKey)
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  const [milestones, taskLists, issues] = await Promise.all([
    repository.listGanttMilestones(tenantId, project.id),
    repository.listGanttTaskLists(tenantId, project.id),
    repository.listGanttIssues(tenantId, project.id),
  ])

  const issueIds = issues.map((issue) => issue.id)
  const dependencies =
    issueIds.length > 0
      ? await repository.listGanttDependencies(tenantId, issueIds)
      : []

  const projectEdges = dependencies.filter(
    (edge) =>
      issueIds.includes(edge.predecessorIssueId) &&
      issueIds.includes(edge.successorIssueId)
  )

  const schedulingIssues = issues.map((issue) => ({
    id: issue.id,
    plannedStart: issuePlannedStart(issue),
    plannedFinish: issuePlannedFinish(issue),
    plannedDurationMinutes: issue.plannedDurationMinutes,
  }))
  const schedulingEdges = projectEdges.map((edge) => ({
    id: edge.id,
    predecessorIssueId: edge.predecessorIssueId,
    successorIssueId: edge.successorIssueId,
    type: edge.type,
    lagMinutes: edge.lagMinutes,
  }))
  const scheduling = computeCriticalPath(schedulingIssues, schedulingEdges)
  const criticalSet = new Set(scheduling.criticalIssueIds)

  const rows: SerializedGanttRow[] = []
  const childrenByParent = new Map<string, GanttIssueRow[]>()
  for (const issue of issues) {
    if (issue.parentIssueId) {
      const bucket = childrenByParent.get(issue.parentIssueId) ?? []
      bucket.push(issue)
      childrenByParent.set(issue.parentIssueId, bucket)
    }
  }
  const rootIssues = issues.filter((issue) => issue.parentIssueId === null)
  const rootByTaskList = new Map<string, GanttIssueRow[]>()
  const rootByMilestone = new Map<string, GanttIssueRow[]>()
  const rootUnassigned: GanttIssueRow[] = []
  for (const issue of rootIssues) {
    if (issue.taskListId) {
      const bucket = rootByTaskList.get(issue.taskListId) ?? []
      bucket.push(issue)
      rootByTaskList.set(issue.taskListId, bucket)
    } else if (issue.milestoneId) {
      const bucket = rootByMilestone.get(issue.milestoneId) ?? []
      bucket.push(issue)
      rootByMilestone.set(issue.milestoneId, bucket)
    } else {
      rootUnassigned.push(issue)
    }
  }

  const taskListsByMilestone = new Map<string, typeof taskLists>()
  const unphasedTaskLists: typeof taskLists = []
  for (const list of taskLists) {
    if (list.milestoneId) {
      const bucket = taskListsByMilestone.get(list.milestoneId) ?? []
      bucket.push(list)
      taskListsByMilestone.set(list.milestoneId, bucket)
    } else {
      unphasedTaskLists.push(list)
    }
  }

  function pushIssueWithSubItems(
    issue: GanttIssueRow,
    parentRowId: string | null,
    isSubItem: boolean
  ) {
    const rowId = isSubItem ? subItemRowId(issue.id) : workItemRowId(issue.id)
    rows.push({
      object: 'gantt-row',
      id: rowId,
      kind: isSubItem ? 'sub-item' : 'work-item',
      parentRowId,
      issueId: issue.id,
      name: issue.title,
      plannedStart: issuePlannedStart(issue),
      plannedFinish: issuePlannedFinish(issue),
      actualStart: issueActualStart(issue),
      actualFinish: actualFinishFor(issue),
      percentComplete: percentCompleteForStatus(issue.status),
      isCritical: criticalSet.has(issue.id),
    })
    if (query.includeSubItems) {
      const children = childrenByParent.get(issue.id) ?? []
      for (const child of children) {
        pushIssueWithSubItems(child, rowId, true)
      }
    }
  }

  function pushTaskListGroup(
    taskListId: string,
    taskListName: string,
    plannedStart: number | null,
    plannedFinish: number | null,
    parentRowId: string | null,
    memberIssues: GanttIssueRow[]
  ) {
    const rowId = taskListRowId(taskListId)
    rows.push({
      object: 'gantt-row',
      id: rowId,
      kind: 'task-list',
      parentRowId,
      issueId: null,
      name: taskListName,
      plannedStart,
      plannedFinish,
      actualStart: null,
      actualFinish: null,
      percentComplete: percentForIssues(memberIssues),
      isCritical: false,
    })
    for (const issue of memberIssues) {
      pushIssueWithSubItems(issue, rowId, false)
    }
  }

  for (const milestone of milestones) {
    const phaseId = phaseRowId(milestone.id)
    const phaseIssues = issues.filter(
      (issue) => issue.milestoneId === milestone.id
    )
    const phaseStart =
      milestone.startDate === null || milestone.startDate === undefined
        ? null
        : Number(milestone.startDate)
    const phaseFinish =
      milestone.targetDate === null || milestone.targetDate === undefined
        ? null
        : Number(milestone.targetDate)
    rows.push({
      object: 'gantt-row',
      id: phaseId,
      kind: 'phase',
      parentRowId: null,
      issueId: null,
      name: milestone.name,
      plannedStart: phaseStart,
      plannedFinish: phaseFinish,
      actualStart: null,
      actualFinish: null,
      percentComplete: percentForIssues(
        phaseIssues.filter((issue) => issue.parentIssueId === null)
      ),
      isCritical: false,
    })
    const lists = taskListsByMilestone.get(milestone.id) ?? []
    for (const list of lists) {
      const memberIssues = rootByTaskList.get(list.id) ?? []
      const listStart =
        list.startDate === null || list.startDate === undefined
          ? null
          : Number(list.startDate)
      const listFinish =
        list.targetDate === null || list.targetDate === undefined
          ? null
          : Number(list.targetDate)
      pushTaskListGroup(
        list.id,
        list.name,
        listStart,
        listFinish,
        phaseId,
        memberIssues
      )
    }
    const unlisted = rootByMilestone.get(milestone.id) ?? []
    for (const issue of unlisted) {
      pushIssueWithSubItems(issue, phaseId, false)
    }
  }

  for (const list of unphasedTaskLists) {
    const memberIssues = rootByTaskList.get(list.id) ?? []
    const listStart =
      list.startDate === null || list.startDate === undefined
        ? null
        : Number(list.startDate)
    const listFinish =
      list.targetDate === null || list.targetDate === undefined
        ? null
        : Number(list.targetDate)
    pushTaskListGroup(
      list.id,
      list.name,
      listStart,
      listFinish,
      null,
      memberIssues
    )
  }

  for (const issue of rootUnassigned) {
    pushIssueWithSubItems(issue, null, false)
  }

  let rangeStart: number | null = null
  let rangeEnd: number | null = null
  for (const row of rows) {
    if (row.plannedStart !== null) {
      rangeStart =
        rangeStart === null || row.plannedStart < rangeStart
          ? row.plannedStart
          : rangeStart
    }
    if (row.plannedFinish !== null) {
      rangeEnd =
        rangeEnd === null || row.plannedFinish > rangeEnd
          ? row.plannedFinish
          : rangeEnd
    }
  }

  return {
    data: {
      object: 'gantt',
      rows,
      edges: projectEdges.map(serializeGanttEdge),
      criticalIssueIds: scheduling.criticalIssueIds,
      range: { start: rangeStart, end: rangeEnd },
    },
    error: null,
  }
}
