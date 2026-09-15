import { getError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { prisma } from '../../db/index.js'

export async function listCycles(tenantId: string, projectId?: string) {
  return prisma.cycle.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: [{ startsAt: 'asc' }, { number: 'asc' }],
  })
}

export async function retrieveCycle(tenantId: string, id: string) {
  return prisma.cycle.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export async function retrieveCycleByNumber(tenantId: string, number: number) {
  return prisma.cycle.findFirst({
    where: { tenantId, number, deletedAt: null },
  })
}

export async function maxCycleNumber(tenantId: string) {
  const row = await prisma.cycle.findFirst({
    where: { tenantId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  return row?.number ?? 0
}

export async function createCycle(
  data: Parameters<typeof prisma.cycle.create>[0]['data']
) {
  return prisma.cycle.create({ data })
}

export async function updateCycle(
  id: string,
  data: Parameters<typeof prisma.cycle.update>[0]['data']
) {
  return prisma.cycle.update({ where: { id }, data })
}

export async function softDeleteCycle(id: string, deletedAt: bigint) {
  return prisma.cycle.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function cycleProgress(tenantId: string, cycleId: string) {
  const where = { tenantId, cycleId, deletedAt: null }
  const [total, completedRows] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where: {
        ...where,
        OR: [
          { workflowState: { is: { category: 'completed' } } },
          { workflowStateId: null, status: 'done' },
        ],
      },
      select: { id: true, estimate: true, completedAt: true },
    }),
  ])
  const completed = completedRows.length
  const estimatePoints = await prisma.issue.aggregate({
    where,
    _sum: { estimate: true },
  })
  const completedEstimatePoints = completedRows.reduce(
    (sum, row) => sum + (row.estimate ?? 0),
    0
  )
  return {
    total,
    completed,
    estimatePoints: estimatePoints._sum.estimate ?? 0,
    completedEstimatePoints,
  }
}

export async function cycleThroughput(
  tenantId: string,
  cycleId: string,
  startsAt: bigint | number,
  endsAt: bigint | number
) {
  const start = BigInt(startsAt)
  const end = BigInt(endsAt)
  const completedInWindow = await prisma.issue.count({
    where: {
      tenantId,
      cycleId,
      deletedAt: null,
      completedAt: { gte: start, lte: end },
    },
  })
  return { completedInWindow }
}

export async function assignIssuesToCycle(
  tenantId: string,
  cycle: { id: string; projectId: string | null },
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
    if (cycle.projectId && issue.projectId !== cycle.projectId)
      return { error: getError('projects/invalid-request') }
  }
  for (const issueId of issueIds) {
    const issue = byId.get(issueId)
    if (!issue) continue
    if (issue.cycleId === cycle.id) continue
    await prisma.issue.update({
      where: { id: issue.id },
      data: { cycleId: cycle.id, updatedAt: timestamp },
    })
    await prisma.issueEvent.create({
      data: {
        id: generateId('issueEvent'),
        tenantId,
        issueId: issue.id,
        actorUserId,
        type: 'cycle-changed',
        fromValue: issue.cycleId,
        toValue: cycle.id,
        createdAt: timestamp,
      },
    })
  }
  return { error: null }
}

export async function unassignIssueFromCycle(
  tenantId: string,
  cycleId: string,
  issueId: string,
  actorUserId: string | null,
  timestamp: bigint
) {
  const issue = await prisma.issue.findFirst({
    where: { tenantId, id: issueId, cycleId, deletedAt: null },
  })
  if (!issue) return { error: getError('projects/issue-not-found') }
  await prisma.issue.update({
    where: { id: issue.id },
    data: { cycleId: null, updatedAt: timestamp },
  })
  await prisma.issueEvent.create({
    data: {
      id: generateId('issueEvent'),
      tenantId,
      issueId: issue.id,
      actorUserId,
      type: 'cycle-changed',
      fromValue: cycleId,
      toValue: null,
      createdAt: timestamp,
    },
  })
  return { error: null }
}
