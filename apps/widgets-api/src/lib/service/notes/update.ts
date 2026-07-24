import { prisma } from '@/lib/db'
import { auditId, unixSeconds } from '@/lib/id'
import { err, ok, type ServiceResult } from '../result'
import { assertOwnedCollection } from './collection'
import { serializeNote } from './serialize'
import type { NoteColor, NotepadNoteResource } from './types'
import { validateEntryText } from './validate'

export async function updateNote(params: {
  id: string
  ownerAccountId: string
  title?: string
  body?: string
  color?: NoteColor
  pinned?: boolean
  collectionId?: string | null
}): Promise<ServiceResult<NotepadNoteResource>> {
  const existing = await prisma.notepadNote.findUnique({
    where: { id: params.id },
  })
  if (!existing || existing.ownerAccountId !== params.ownerAccountId)
    return err('Notepad entry not found.', 404, 'widgets/note-not-found')

  const title = params.title ?? existing.title
  const body = params.body ?? existing.body
  const validation = validateEntryText(title, body)
  if (validation) return validation

  if (params.collectionId !== undefined) {
    const collectionCheck = await assertOwnedCollection({
      ownerAccountId: params.ownerAccountId,
      collectionId: params.collectionId,
    })
    if (collectionCheck) return collectionCheck
  }

  const row = await prisma.notepadNote.update({
    where: { id: existing.id },
    data: {
      title: title.trim(),
      body,
      ...(params.color !== undefined ? { color: params.color } : {}),
      ...(params.pinned !== undefined ? { pinned: params.pinned } : {}),
      ...(params.collectionId !== undefined
        ? { collectionId: params.collectionId }
        : {}),
      updatedAt: unixSeconds(),
    },
  })

  return ok(serializeNote(row))
}

export async function adminUpdateNote(params: {
  id: string
  actorUserId: string
  title?: string
  body?: string
  color?: NoteColor
  pinned?: boolean
  collectionId?: string | null
}): Promise<ServiceResult<NotepadNoteResource>> {
  const existing = await prisma.notepadNote.findUnique({
    where: { id: params.id },
  })
  if (!existing)
    return err('Notepad entry not found.', 404, 'widgets/note-not-found')

  const title = params.title ?? existing.title
  const body = params.body ?? existing.body
  const validation = validateEntryText(title, body)
  if (validation) return validation

  if (params.collectionId !== undefined) {
    const collectionCheck = await assertOwnedCollection({
      ownerAccountId: existing.ownerAccountId,
      collectionId: params.collectionId,
    })
    if (collectionCheck) return collectionCheck
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.notepadNote.update({
      where: { id: existing.id },
      data: {
        title: title.trim(),
        body,
        ...(params.color !== undefined ? { color: params.color } : {}),
        ...(params.pinned !== undefined ? { pinned: params.pinned } : {}),
        ...(params.collectionId !== undefined
          ? { collectionId: params.collectionId }
          : {}),
        updatedAt: unixSeconds(),
      },
    })

    await tx.widgetAuditEvent.create({
      data: {
        id: auditId(),
        widgetId: 'notepad',
        action: 'widgets.notepad.updated',
        resourceId: updated.id,
        actorUserId: params.actorUserId,
        targetOwnerAccountId: updated.ownerAccountId,
        occurredAt: unixSeconds(),
      },
    })

    return updated
  })

  return ok(serializeNote(row))
}
