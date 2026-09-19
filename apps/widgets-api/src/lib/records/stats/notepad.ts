import { prisma } from '@/lib/db'
import { ok } from '../result'
import type { ServiceResult } from '../result'
import type { NotepadStats } from './types'

export async function retrieveNotepadStats(): Promise<
  ServiceResult<NotepadStats>
> {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  const [
    notes,
    collections,
    accountRows,
    pinnedNotes,
    filedNotes,
    notesCreatedLast30d,
    notesUpdatedLast30d,
    activeAccountRows,
  ] = await Promise.all([
    prisma.notepadNote.count(),
    prisma.notepadCollection.count(),
    prisma.notepadNote.groupBy({ by: ['ownerAccountId'] }),
    prisma.notepadNote.count({ where: { pinned: true } }),
    prisma.notepadNote.count({ where: { collectionId: { not: null } } }),
    prisma.notepadNote.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.notepadNote.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.notepadNote.groupBy({
      by: ['ownerAccountId'],
      where: { updatedAt: { gte: thirtyDaysAgo } },
    }),
  ])

  return ok({
    object: 'notepad_stats',
    notes,
    collections,
    accounts: accountRows.length,
    pinned_notes: pinnedNotes,
    filed_notes: filedNotes,
    notes_created_last_30d: notesCreatedLast30d,
    notes_updated_last_30d: notesUpdatedLast30d,
    active_accounts_last_30d: activeAccountRows.length,
    generated_at: Math.floor(Date.now() / 1000),
  })
}
