import { prisma } from '../../db/index.js'
import { decodeActivityCursor } from './activity.serializers.js'
import type { ActivitySourceRow } from './activity.serializers.js'

export type ActivityScope = {
  tenantId: string
  projectId?: string
}

export type ActivityPage = {
  limit: number
  cursor?: string
}

type CursorBound = {
  createdAt: bigint
  id: string
}

function cursorWhere(cursor: string | undefined): CursorBound | null {
  if (!cursor) return null
  return decodeActivityCursor(cursor)
}

function beforeBound(bound: CursorBound | null) {
  if (!bound) return {}
  return {
    OR: [
      { createdAt: { lt: bound.createdAt } },
      { createdAt: bound.createdAt, id: { lt: bound.id } },
    ],
  }
}

const pageOrder = [{ createdAt: 'desc' }, { id: 'desc' }] as const

export async function listActivity(
  scope: ActivityScope,
  page: ActivityPage
): Promise<ActivitySourceRow[]> {
  const bound = cursorWhere(page.cursor)
  const take = page.limit + 1
  const { tenantId, projectId } = scope

  const issueEvents = await prisma.issueEvent.findMany({
    where: {
      tenantId,
      ...(projectId ? { issue: { projectId } } : {}),
      ...beforeBound(bound),
    },
    orderBy: [...pageOrder],
    take,
  })

  const milestoneEvents = await prisma.milestoneEvent.findMany({
    where: {
      tenantId,
      ...(projectId ? { milestone: { projectId } } : {}),
      ...beforeBound(bound),
    },
    orderBy: [...pageOrder],
    take,
  })

  const timesheetEvents = await prisma.timesheetEvent.findMany({
    where: {
      tenantId,
      ...(projectId
        ? { timesheet: { entries: { some: { projectId } } } }
        : {}),
      ...beforeBound(bound),
    },
    orderBy: [...pageOrder],
    take,
  })

  let runWhere: Record<string, unknown> = { tenantId, ...beforeBound(bound) }
  if (projectId) {
    const projectIssues = await prisma.issue.findMany({
      where: { tenantId, projectId, deletedAt: null },
      select: { id: true },
    })
    const issueIds = projectIssues.map((issue) => issue.id)
    runWhere = {
      tenantId,
      ...beforeBound(bound),
      event: {
        OR: [
          { subjectType: 'project', subjectId: projectId },
          { subjectType: 'work-item', subjectId: { in: issueIds } },
        ],
      },
    }
  }
  const automationRuns = await prisma.automationRun.findMany({
    where: runWhere,
    include: { event: { select: { subjectType: true, subjectId: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  })

  const rows: ActivitySourceRow[] = [
    ...issueEvents.map(
      (event): ActivitySourceRow => ({
        id: `issue-event:${event.id}`,
        kind: 'issue-event',
        subjectType: 'work-item',
        subjectId: event.issueId,
        actorUserId: event.actorUserId,
        type: event.type,
        fromValue: event.fromValue,
        toValue: event.toValue,
        createdAt: event.createdAt,
      })
    ),
    ...milestoneEvents.map(
      (event): ActivitySourceRow => ({
        id: `milestone-event:${event.id}`,
        kind: 'milestone-event',
        subjectType: 'phase',
        subjectId: event.milestoneId,
        actorUserId: event.actorUserId,
        type: event.type,
        fromValue: event.fromValue,
        toValue: event.toValue,
        createdAt: event.createdAt,
      })
    ),
    ...timesheetEvents.map(
      (event): ActivitySourceRow => ({
        id: `timesheet-event:${event.id}`,
        kind: 'timesheet-event',
        subjectType: 'timesheet',
        subjectId: event.timesheetId,
        actorUserId: event.actorUserId,
        type: 'status-changed',
        fromValue: event.fromStatus,
        toValue: event.toStatus,
        createdAt: event.createdAt,
      })
    ),
    ...automationRuns.map(
      (run): ActivitySourceRow => ({
        id: `automation-run:${run.id}`,
        kind: 'automation-run',
        subjectType: run.event.subjectType,
        subjectId: run.event.subjectId,
        actorUserId: null,
        type: run.status,
        fromValue: null,
        toValue: null,
        createdAt: run.createdAt,
      })
    ),
  ]

  rows.sort((left, right) => {
    const leftAt = Number(left.createdAt)
    const rightAt = Number(right.createdAt)
    if (rightAt !== leftAt) return rightAt - leftAt
    return right.id < left.id ? 1 : right.id > left.id ? -1 : 0
  })
  return rows
}
