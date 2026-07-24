import { prisma } from '@/lib/db'
import { err, ok, type ServiceResult } from '../result'
import type { DeletedCollection } from './types'

export async function deleteCollection(params: {
  id: string
  ownerAccountId: string
}): Promise<ServiceResult<DeletedCollection>> {
  const existing = await prisma.notepadCollection.findUnique({
    where: { id: params.id },
  })
  if (!existing || existing.ownerAccountId !== params.ownerAccountId)
    return err('Collection not found.', 404, 'widgets/collection-not-found')

  // FK onDelete: SetNull rehomes notes to Unfiled; delete in a transaction
  // so the collection row and any note nulling stay consistent.
  await prisma.$transaction(async (tx) => {
    await tx.notepadNote.updateMany({
      where: {
        collectionId: existing.id,
        ownerAccountId: params.ownerAccountId,
      },
      data: { collectionId: null },
    })
    await tx.notepadCollection.delete({ where: { id: existing.id } })
  })

  return ok({
    object: 'collection',
    id: existing.id,
    deleted: true,
  })
}
