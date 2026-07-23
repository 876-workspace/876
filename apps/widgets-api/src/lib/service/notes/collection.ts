import { prisma } from '@/lib/db'
import { err, type ServiceErr } from '../result'

/** Ensure collectionId is owned by the actor, or is null (Unfiled). */
export async function assertOwnedCollection(params: {
  ownerAccountId: string
  collectionId: string | null
}): Promise<ServiceErr | null> {
  if (params.collectionId === null) return null

  const collection = await prisma.notepadCollection.findUnique({
    where: { id: params.collectionId },
  })
  if (!collection || collection.ownerAccountId !== params.ownerAccountId)
    return err('Collection not found.', 404, 'widgets/collection-not-found')

  return null
}
