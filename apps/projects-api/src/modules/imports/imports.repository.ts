import { prisma } from '../../db/index.js'
import type { ImportJobRow, ImportJobRowRow } from './imports.serializers.js'

export type CreateJobData = {
  id: string
  tenantId: string
  source: string
  projectId: string | null
  status: string
  rowCount: number
  contentHash: string
  bundle: unknown
  preview: unknown
  unmappedFields: unknown
  createdAt: bigint
  updatedAt: bigint
}

export async function listJobs(
  tenantId: string,
  filter: { status?: string; limit: number }
): Promise<ImportJobRow[]> {
  const rows = await prisma.importJob.findMany({
    where: {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: filter.limit,
  })
  return rows as unknown as ImportJobRow[]
}

export async function retrieveJob(
  tenantId: string,
  id: string
): Promise<ImportJobRow | null> {
  const row = await prisma.importJob.findFirst({ where: { tenantId, id } })
  return row as unknown as ImportJobRow | null
}

export async function createJob(data: CreateJobData): Promise<ImportJobRow> {
  const row = await prisma.importJob.create({
    data: {
      ...data,
      bundle: data.bundle as never,
      preview: data.preview as never,
      unmappedFields: data.unmappedFields as never,
    },
  })
  return row as unknown as ImportJobRow
}

export async function updateJob(
  id: string,
  data: {
    status?: string
    successCount?: number
    failureCount?: number
    updatedAt: bigint
  }
): Promise<ImportJobRow> {
  const row = await prisma.importJob.update({ where: { id }, data })
  return row as unknown as ImportJobRow
}

export type CreateJobRowData = {
  id: string
  tenantId: string
  jobId: string
  rowIndex: number
  kind: string
  status: string
  externalRef: string | null
  createdAt: bigint
  updatedAt: bigint
}

export async function createJobRows(
  rows: CreateJobRowData[]
): Promise<void> {
  if (rows.length === 0) return
  await prisma.importJobRow.createMany({ data: rows, skipDuplicates: true })
}

export async function listJobRows(
  jobId: string
): Promise<ImportJobRowRow[]> {
  const rows = await prisma.importJobRow.findMany({
    where: { jobId },
    orderBy: [{ rowIndex: 'asc' }],
  })
  return rows as unknown as ImportJobRowRow[]
}

export async function updateJobRow(
  id: string,
  data: {
    status: string
    createdId?: string | null
    error?: unknown
    updatedAt: bigint
  }
): Promise<void> {
  await prisma.importJobRow.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.createdId !== undefined ? { createdId: data.createdId } : {}),
      ...(data.error !== undefined ? { error: data.error as never } : {}),
      updatedAt: data.updatedAt,
    },
  })
}

export async function countJobsSince(
  since: bigint
): Promise<Array<{ status: string; failures: number; count: number }>> {
  const rows = await prisma.importJob.findMany({
    where: { createdAt: { gte: since } },
    select: { status: true, failureCount: true },
  })
  const byStatus = new Map<string, { failures: number; count: number }>()
  for (const row of rows) {
    const entry = byStatus.get(row.status) ?? { failures: 0, count: 0 }
    entry.count += 1
    if (row.failureCount > 0) entry.failures += 1
    byStatus.set(row.status, entry)
  }
  return [...byStatus.entries()].map(([status, value]) => ({
    status,
    ...value,
  }))
}
