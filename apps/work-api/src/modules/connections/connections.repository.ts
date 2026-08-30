import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export function activeConnection(tenantId: string, appId: string) {
  return prisma.workAppConnection.findFirst({
    where: { tenantId, appId, status: 'ACTIVE' },
    select: { scopes: true },
  })
}

export async function ensure(
  tenantId: string,
  appId: string,
  scopes: readonly string[]
) {
  const existing = await prisma.workAppConnection.findUnique({
    where: { tenantId_appId: { tenantId, appId } },
  })
  if (existing) return existing

  try {
    return await prisma.workAppConnection.create({
      data: {
        id: `work_conn_${randomUUID().replaceAll('-', '')}`,
        tenantId,
        appId,
        scopes: [...scopes],
      },
    })
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error
    const winner = await prisma.workAppConnection.findUnique({
      where: { tenantId_appId: { tenantId, appId } },
    })
    if (!winner) throw error
    return winner
  }
}
