import { prisma } from '@/lib/db'
import { auditId, unixSeconds } from '@/lib/id'
import { err, ok, type ServiceResult } from '../result'
import type { DeletedNote } from './types'

export async function deleteNote(params: {
  id: string
  ownerAccountId: string
}): Promise<ServiceResult<DeletedNote>> {
  const existing = await prisma.notepadNote.findUnique({
    where: { id: params.id },
  })
  if (!existing || existing.ownerAccountId !== params.ownerAccountId)
    return err('Notepad entry not found.', 404, 'widgets/note-not-found')

  await prisma.notepadNote.delete({ where: { id: existing.id } })

  return ok({ object: 'note', id: existing.id, deleted: true })
}

export async function adminDeleteNote(params: {
  id: string
  actorUserId: string
}): Promise<ServiceResult<DeletedNote>> {
  const existing = await prisma.notepadNote.findUnique({
    where: { id: params.id },
  })
  if (!existing)
    return err('Notepad entry not found.', 404, 'widgets/note-not-found')

  await prisma.$transaction(async (tx) => {
    await tx.notepadNote.delete({ where: { id: existing.id } })
    await tx.widgetAuditEvent.create({
      data: {
        id: auditId(),
        widgetId: 'notepad',
        action: 'widgets.notepad.deleted',
        resourceId: existing.id,
        actorUserId: params.actorUserId,
        targetOwnerAccountId: existing.ownerAccountId,
        occurredAt: unixSeconds(),
      },
    })
  })

  return ok({ object: 'note', id: existing.id, deleted: true })
}
