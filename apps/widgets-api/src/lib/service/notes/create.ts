import { prisma } from '@/lib/db'
import { noteId, unixSeconds } from '@/lib/id'
import { err, ok, type ServiceResult } from '../result'
import { assertOwnedCollection } from './collection'
import { serializeNote } from './serialize'
import { type NoteColor, type NotepadNoteResource } from './types'
import { validateEntryText } from './validate'

export async function createNote(params: {
  ownerAccountId: string
  title: string
  body: string
  color?: NoteColor
  pinned?: boolean
  collectionId?: string | null
}): Promise<ServiceResult<NotepadNoteResource>> {
  const validation = validateEntryText(params.title, params.body)
  if (validation) return validation
  if (!params.ownerAccountId.trim())
    return err('Owner account is required.', 400, 'widgets/missing-owner')

  const collectionId =
    params.collectionId === undefined ? null : params.collectionId
  const collectionCheck = await assertOwnedCollection({
    ownerAccountId: params.ownerAccountId,
    collectionId,
  })
  if (collectionCheck) return collectionCheck

  const now = unixSeconds()
  const row = await prisma.notepadNote.create({
    data: {
      id: noteId(),
      ownerAccountId: params.ownerAccountId,
      collectionId,
      title: params.title.trim(),
      body: params.body,
      color: params.color ?? 'yellow',
      pinned: params.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    },
  })

  return ok(serializeNote(row))
}
