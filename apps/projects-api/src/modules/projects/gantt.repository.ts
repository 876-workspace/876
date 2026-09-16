import { prisma } from '../../db/index.js'
import type {
  GanttDependencyRow,
  GanttIssueRow,
  GanttMilestoneRow,
  GanttTaskListRow,
} from './gantt.serializers.js'

export async function listGanttMilestones(
  tenantId: string,
  projectId: string
): Promise<GanttMilestoneRow[]> {
  const rows = await prisma.milestone.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      key: true,
      name: true,
      startDate: true,
      targetDate: true,
      position: true,
    },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
  return rows as unknown as GanttMilestoneRow[]
}

export async function listGanttTaskLists(
  tenantId: string,
  projectId: string
): Promise<GanttTaskListRow[]> {
  const rows = await prisma.taskList.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      milestoneId: true,
      name: true,
      startDate: true,
      targetDate: true,
      position: true,
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as GanttTaskListRow[]
}

export async function listGanttIssues(
  tenantId: string,
  projectId: string
): Promise<GanttIssueRow[]> {
  const rows = await prisma.issue.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      identifier: true,
      title: true,
      status: true,
      taskListId: true,
      milestoneId: true,
      parentIssueId: true,
      plannedStartDate: true,
      plannedFinishDate: true,
      plannedDurationMinutes: true,
      position: true,
      startedAt: true,
      completedAt: true,
      canceledAt: true,
    },
    orderBy: [{ position: 'asc' }, { identifier: 'asc' }],
  })
  return rows as unknown as GanttIssueRow[]
}

export async function listGanttDependencies(
  tenantId: string,
  issueIds: string[]
): Promise<GanttDependencyRow[]> {
  if (issueIds.length === 0) return []
  const rows = await prisma.issueDependency.findMany({
    where: {
      tenantId,
      OR: [
        { predecessorIssueId: { in: issueIds } },
        { successorIssueId: { in: issueIds } },
      ],
    },
    select: {
      id: true,
      predecessorIssueId: true,
      successorIssueId: true,
      type: true,
      lagMinutes: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as GanttDependencyRow[]
}
