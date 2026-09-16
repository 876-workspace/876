import { prisma } from '../../db/index.js'

export type StatusCounts = Array<{ status: string; count: number }>

export async function countAutomationRuns(since: bigint): Promise<StatusCounts> {
  const rows = await prisma.automationRun.groupBy({
    by: ['status'],
    where: { createdAt: { gte: since } },
    _count: { status: true },
  })
  return rows.map((row) => ({ status: row.status, count: row._count.status }))
}

export async function countWebhookDeliveries(
  since: bigint
): Promise<StatusCounts> {
  const rows = await prisma.webhookDelivery.groupBy({
    by: ['status'],
    where: { createdAt: { gte: since } },
    _count: { status: true },
  })
  return rows.map((row) => ({ status: row.status, count: row._count.status }))
}

export async function countImportJobs(
  since: bigint
): Promise<{ total: number; failed: number }> {
  const rows = await prisma.importJob.findMany({
    where: { createdAt: { gte: since } },
    select: { failureCount: true },
  })
  return {
    total: rows.length,
    failed: rows.filter((row) => row.failureCount > 0).length,
  }
}
