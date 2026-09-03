import { prisma } from '../../db/index.js'
import type { LabelRow } from './labels.serializers.js'

export async function list(tenantId: string): Promise<LabelRow[]> {
  const rows = await prisma.label.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  })

  return rows as LabelRow[]
}

export async function retrieve(
  tenantId: string,
  id: string
): Promise<LabelRow | null> {
  const row = await prisma.label.findFirst({
    where: { tenantId, id },
  })

  return row as LabelRow | null
}

export async function retrieveByName(
  tenantId: string,
  name: string
): Promise<LabelRow | null> {
  const row = await prisma.label.findUnique({
    where: {
      tenantId_name: { tenantId, name },
    },
  })

  return row as LabelRow | null
}

export async function create(params: {
  id: string
  tenantId: string
  name: string
  color: string
  description?: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<LabelRow> {
  const row = await prisma.label.create({
    data: params,
  })

  return row as LabelRow
}

export async function update(
  tenantId: string,
  id: string,
  params: {
    name?: string
    color?: string
    description?: string | null
    updatedAt: bigint
  }
): Promise<LabelRow> {
  const row = await prisma.label.update({
    where: { id },
    data: params,
  })

  return row as LabelRow
}

export async function hardDelete(tenantId: string, id: string): Promise<void> {
  await prisma.label.delete({
    where: { id },
  })
}
