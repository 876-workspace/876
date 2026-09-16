import { prisma } from '../../db/index.js'
import type { AttachmentLinkRow } from './attachment-links.serializers.js'

export async function listAttachmentLinks(
  tenantId: string,
  projectId: string,
  options: {
    limit: number
    startingAfter?: string
    issueId?: string
    milestoneId?: string
  }
): Promise<AttachmentLinkRow[]> {
  const rows = await prisma.attachmentLink.findMany({
    where: {
      tenantId,
      projectId,
      ...(options.issueId ? { issueId: options.issueId } : {}),
      ...(options.milestoneId ? { milestoneId: options.milestoneId } : {}),
    },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })
  return rows as AttachmentLinkRow[]
}

export async function retrieveAttachmentLink(
  tenantId: string,
  projectId: string,
  id: string
): Promise<AttachmentLinkRow | null> {
  const row = await prisma.attachmentLink.findFirst({
    where: { tenantId, projectId, id },
  })
  return (row ?? null) as AttachmentLinkRow | null
}

export async function createAttachmentLink(params: {
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  url: string
  name: string | null
  createdBy: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<AttachmentLinkRow> {
  const row = await prisma.attachmentLink.create({ data: params })
  return row as AttachmentLinkRow
}

export async function updateAttachmentLink(
  id: string,
  params: { url?: string; name?: string | null; updatedAt: bigint }
): Promise<AttachmentLinkRow> {
  const row = await prisma.attachmentLink.update({
    where: { id },
    data: params,
  })
  return row as AttachmentLinkRow
}

export async function setAttachmentVisibility(
  id: string,
  clientVisible: boolean,
  updatedAt: bigint
): Promise<AttachmentLinkRow> {
  const row = await prisma.attachmentLink.update({
    where: { id },
    data: { clientVisible, updatedAt },
  })
  return row as AttachmentLinkRow
}

export async function deleteAttachmentLink(id: string): Promise<void> {
  await prisma.attachmentLink.delete({ where: { id } })
}
