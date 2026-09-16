import { prisma } from '../../db/index.js'
import type {
  ProjectBaselineItemRow,
  ProjectBaselineRow,
} from './baselines.serializers.js'

export async function listBaselines(
  tenantId: string,
  projectId: string
): Promise<ProjectBaselineRow[]> {
  const rows = await prisma.projectBaseline.findMany({
    where: { tenantId, projectId },
    orderBy: [{ capturedAt: 'desc' }, { id: 'asc' }],
  })
  return rows as unknown as ProjectBaselineRow[]
}

export async function retrieveBaseline(
  tenantId: string,
  baselineId: string
): Promise<ProjectBaselineRow | null> {
  const row = await prisma.projectBaseline.findFirst({
    where: { tenantId, id: baselineId },
  })
  return row as unknown as ProjectBaselineRow | null
}

export async function countBaselineItems(
  tenantId: string,
  baselineId: string
): Promise<number> {
  return prisma.projectBaselineItem.count({
    where: { tenantId, baselineId },
  })
}

export async function countBaselineItemsMany(
  tenantId: string,
  baselineIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const baselineId of baselineIds) counts.set(baselineId, 0)
  if (baselineIds.length === 0) return counts
  const rows = await prisma.projectBaselineItem.groupBy({
    by: ['baselineId'],
    where: { tenantId, baselineId: { in: baselineIds } },
    _count: { baselineId: true },
  })
  for (const row of rows) {
    counts.set(row.baselineId, row._count.baselineId)
  }
  return counts
}

export async function listBaselineItems(
  tenantId: string,
  baselineId: string
): Promise<ProjectBaselineItemRow[]> {
  const rows = await prisma.projectBaselineItem.findMany({
    where: { tenantId, baselineId },
    orderBy: { issueId: 'asc' },
  })
  return rows as unknown as ProjectBaselineItemRow[]
}

export async function createBaseline(params: {
  id: string
  tenantId: string
  projectId: string
  name: string
  capturedBy: string | null
  capturedAt: bigint
  note: string | null
}): Promise<ProjectBaselineRow> {
  const row = await prisma.projectBaseline.create({ data: params })
  return row as unknown as ProjectBaselineRow
}

export async function createBaselineItems(
  items: Array<{
    id: string
    tenantId: string
    baselineId: string
    issueId: string
    plannedStartDate: bigint | null
    plannedFinishDate: bigint | null
    plannedDurationMinutes: number | null
    status: string
  }>
): Promise<number> {
  if (items.length === 0) return 0
  const result = await prisma.projectBaselineItem.createMany({
    data: items,
  })
  return result.count
}

export async function deleteBaseline(
  tenantId: string,
  baselineId: string
): Promise<void> {
  await prisma.projectBaseline.deleteMany({
    where: { tenantId, id: baselineId },
  })
}
