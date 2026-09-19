import { prisma } from '../../db/index.js'
import type { CaptureRow } from './captures.serializers.js'

export async function list(
  tenantId: string,
  status: string
): Promise<CaptureRow[]> {
  return prisma.capture.findMany({
    where: { tenantId, status },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  }) as Promise<CaptureRow[]>
}
export async function retrieve(
  tenantId: string,
  id: string
): Promise<CaptureRow | null> {
  return prisma.capture.findFirst({
    where: { id, tenantId },
  }) as Promise<CaptureRow | null>
}
export async function create(
  data: Omit<
    CaptureRow,
    'body' | 'projectId' | 'promotedIssueId' | 'source'
  > & {
    body: string | null
    projectId: string | null
    source: string | null
    promotedIssueId: string | null
  }
): Promise<CaptureRow> {
  return prisma.capture.create({ data }) as Promise<CaptureRow>
}
export async function update(
  tenantId: string,
  id: string,
  data: Record<string, unknown>
): Promise<CaptureRow> {
  return prisma.capture.update({ where: { id }, data }) as Promise<CaptureRow>
}
export async function hardDelete(tenantId: string, id: string): Promise<void> {
  await prisma.capture.deleteMany({ where: { id, tenantId } })
}
