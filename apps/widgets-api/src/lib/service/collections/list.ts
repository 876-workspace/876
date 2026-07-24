import { prisma } from '@/lib/db'
import { ok, type ServiceResult } from '../result'
import { serializeCollection } from './serialize'
import type { CollectionList } from './types'

export async function listCollections(params: {
  ownerAccountId: string
}): Promise<ServiceResult<CollectionList>> {
  const rows = await prisma.notepadCollection.findMany({
    where: { ownerAccountId: params.ownerAccountId },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    include: {
      _count: { select: { notes: true } },
    },
  })

  return ok({
    object: 'list',
    data: rows.map((row) => serializeCollection(row, row._count.notes)),
    has_more: false,
    url: '/v1/collections',
    total_count: rows.length,
  })
}
