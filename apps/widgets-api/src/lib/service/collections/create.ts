import { prisma } from '@/lib/db'
import { collectionId, unixSeconds } from '@/lib/id'
import { err, ok, type ServiceResult } from '../result'
import type { NoteColor } from '../notes/types'
import { serializeCollection } from './serialize'
import type { NotepadCollectionResource } from './types'
import { validateCollectionName } from './validate'

export async function createCollection(params: {
  ownerAccountId: string
  name: string
  color?: NoteColor | null
}): Promise<ServiceResult<NotepadCollectionResource>> {
  const validation = validateCollectionName(params.name)
  if (validation) return validation
  if (!params.ownerAccountId.trim())
    return err('Owner account is required.', 400, 'widgets/missing-owner')

  const name = params.name.trim()
  const now = unixSeconds()

  try {
    const row = await prisma.notepadCollection.create({
      data: {
        id: collectionId(),
        ownerAccountId: params.ownerAccountId,
        name,
        color: params.color ?? null,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok(serializeCollection(row, 0))
  } catch (error) {
    if (isUniqueViolation(error))
      return err(
        'A collection with this name already exists.',
        409,
        'widgets/collection-name-taken'
      )
    throw error
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}
