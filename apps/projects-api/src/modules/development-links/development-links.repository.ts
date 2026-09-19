import { prisma } from '../../db/index.js'
import type { DevelopmentLinkRow } from './development-links.serializers.js'

export type CreateDevelopmentLinkParams = Omit<
  DevelopmentLinkRow,
  'label' | 'externalId' | 'state'
> & {
  label: string | null
  externalId: string
  state: string | null
}

export async function list(
  tenantId: string,
  workItemId: string
): Promise<DevelopmentLinkRow[]> {
  const rows = await prisma.workItemDevelopmentLink.findMany({
    where: { tenantId, workItemId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as DevelopmentLinkRow[]
}

export async function retrieve(
  tenantId: string,
  id: string
): Promise<DevelopmentLinkRow | null> {
  const row = await prisma.workItemDevelopmentLink.findFirst({
    where: { id, tenantId },
  })
  return row as DevelopmentLinkRow | null
}

export async function upsert(
  params: CreateDevelopmentLinkParams
): Promise<DevelopmentLinkRow> {
  const row = await prisma.workItemDevelopmentLink.upsert({
    where: {
      workItemId_kind_externalId: {
        workItemId: params.workItemId,
        kind: params.kind,
        externalId: params.externalId,
      },
    },
    create: params,
    update: {
      url: params.url,
      label: params.label,
      state: params.state,
      updatedAt: params.updatedAt,
    },
  })
  return row as DevelopmentLinkRow
}

export async function update(
  tenantId: string,
  id: string,
  params: { label?: string | null; state?: string | null; updatedAt: bigint }
): Promise<DevelopmentLinkRow> {
  const row = await prisma.workItemDevelopmentLink.update({
    where: { id },
    data: params,
  })
  return row as DevelopmentLinkRow
}

export async function hardDelete(tenantId: string, id: string): Promise<void> {
  await prisma.workItemDevelopmentLink.delete({ where: { id } })
}
