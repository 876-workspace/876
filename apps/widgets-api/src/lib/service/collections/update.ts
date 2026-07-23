import { prisma } from '@/lib/db'
import { unixSeconds } from '@/lib/id'
import { err, ok, type ServiceResult } from '../result'
import type { NoteColor } from '../notes/types'
import { serializeCollection } from './serialize'
import type { NotepadCollectionResource } from './types'
import { validateCollectionName } from './validate'

export async function updateCollection(params: {
  id: string
  ownerAccountId: string
  name?: string
  color?: NoteColor | null
}): Promise<ServiceResult<NotepadCollectionResource>> {
  const existing = await prisma.notepadCollection.findUnique({
    where: { id: params.id },
    include: { _count: { select: { notes: true } } },
  })
  if (!existing || existing.ownerAccountId !== params.ownerAccountId)
    return err('Collection not found.', 404, 'widgets/collection-not-found')

  if (params.name !== undefined) {
    const validation = validateCollectionName(params.name)
    if (validation) return validation
  }

  try {
    const row = await prisma.notepadCollection.update({
      where: { id: existing.id },
      data: {
        ...(params.name !== undefined ? { name: params.name.trim() } : {}),
        ...(params.color !== undefined ? { color: params.color } : {}),
        updatedAt: unixSeconds(),
      },
      include: { _count: { select: { notes: true } } },
    })

    return ok(serializeCollection(row, row._count.notes))
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
