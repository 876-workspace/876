import { getError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { prisma } from '../../db/index.js'

export async function listTaskLists(
  tenantId: string,
  projectId: string,
  includeArchived: boolean
) {
  return prisma.taskList.findMany({
    where: {
      tenantId,
      projectId,
      deletedAt: null,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveTaskList(tenantId: string, id: string) {
  return prisma.taskList.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export async function createTaskList(
  data: Parameters<typeof prisma.taskList.create>[0]['data']
) {
  return prisma.taskList.create({ data })
}

export async function updateTaskList(
  id: string,
  data: Parameters<typeof prisma.taskList.update>[0]['data']
) {
  return prisma.taskList.update({ where: { id }, data })
}

export async function softDeleteTaskList(id: string, deletedAt: bigint) {
  return prisma.taskList.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function taskListProgress(tenantId: string, taskListId: string) {
  const where = { tenantId, taskListId, deletedAt: null }
  const [total, completed] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.count({
      where: {
        ...where,
        OR: [
          { workflowState: { is: { category: 'completed' } } },
          { workflowStateId: null, status: 'done' },
        ],
      },
    }),
  ])
  return { total, completed }
}

export async function countProjectTaskLists(
  tenantId: string,
  projectId: string
) {
  return prisma.taskList.count({
    where: { tenantId, projectId, deletedAt: null },
  })
}

type TaskListLike = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
}

export async function listProjectIssuesForBreakdown(
  tenantId: string,
  projectId: string
) {
  return prisma.issue.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: {
      id: true,
      identifier: true,
      title: true,
      status: true,
      taskListId: true,
      milestoneId: true,
      parentIssueId: true,
    },
    orderBy: [{ position: 'asc' }, { identifier: 'asc' }],
  })
}

export async function assignIssuesToTaskList(
  tenantId: string,
  taskList: TaskListLike,
  issueIds: string[],
  actorUserId: string | null,
  timestamp: bigint
) {
  const issues = await prisma.issue.findMany({
    where: { tenantId, id: { in: issueIds }, deletedAt: null },
  })
  const byId = new Map(issues.map((issue) => [issue.id, issue]))
  for (const issueId of issueIds) {
    const issue = byId.get(issueId)
    if (!issue) return { error: getError('projects/issue-not-found') }
    if (issue.projectId !== taskList.projectId)
      return { error: getError('projects/invalid-request') }
  }

  for (const issueId of issueIds) {
    const issue = byId.get(issueId)
    if (!issue) continue
    const nextMilestoneId = taskList.milestoneId ?? issue.milestoneId
    const taskListChanged = issue.taskListId !== taskList.id
    const milestoneChanged = nextMilestoneId !== issue.milestoneId
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        taskListId: taskList.id,
        milestoneId: nextMilestoneId,
        updatedAt: timestamp,
      },
    })
    if (taskListChanged) {
      await prisma.issueEvent.create({
        data: {
          id: generateId('issueEvent'),
          tenantId,
          issueId: issue.id,
          actorUserId,
          type: 'task-list-changed',
          fromValue: issue.taskListId,
          toValue: taskList.id,
          createdAt: timestamp,
        },
      })
    }
    if (milestoneChanged) {
      await prisma.issueEvent.create({
        data: {
          id: generateId('issueEvent'),
          tenantId,
          issueId: issue.id,
          actorUserId,
          type: 'milestone-changed',
          fromValue: issue.milestoneId,
          toValue: nextMilestoneId,
          createdAt: timestamp,
        },
      })
    }
  }
  return { error: null }
}
