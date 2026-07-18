import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: {
    current: null as null | {
      notepadNote: {
        create: ReturnType<typeof vi.fn>
        findUnique: ReturnType<typeof vi.fn>
        findMany: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
        delete: ReturnType<typeof vi.fn>
      }
      widgetAuditEvent: {
        create: ReturnType<typeof vi.fn>
      }
      $transaction: ReturnType<typeof vi.fn>
    },
  },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

vi.mock('@/lib/id', () => ({
  noteId: () => 'wnote_generated_01',
  auditId: () => 'waudit_generated_01',
  unixSeconds: () => 1_720_100_000,
}))

import { createNote } from './create'
import { adminDeleteNote, deleteNote } from './delete'
import { listAllNotes, listNotes } from './list'
import { adminUpdateNote, updateNote } from './update'

function createRow(
  overrides: Partial<{
    id: string
    ownerAccountId: string
    title: string
    body: string
    color: string
    pinned: boolean
    createdAt: number
    updatedAt: number
  }> = {}
) {
  return {
    id: 'wnote_existing_01',
    ownerAccountId: 'user_alejandra',
    title: 'Customer call notes',
    body: 'Follow up with the Kingston logistics team',
    color: 'yellow',
    pinned: false,
    createdAt: 1_720_000_000,
    updatedAt: 1_720_000_050,
    ...overrides,
  }
}

describe('Notepad notes service', () => {
  beforeEach(() => {
    const notepadNote = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    const widgetAuditEvent = {
      create: vi.fn().mockResolvedValue({}),
    }

    prismaRef.current = {
      notepadNote,
      widgetAuditEvent,
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          notepadNote,
          widgetAuditEvent,
        })
      ),
    }
  })

  describe('createNote', () => {
    it('when title and owner are valid, then persists a trimmed note and returns the resource', async () => {
      const row = createRow({
        id: 'wnote_generated_01',
        title: 'Customer call notes',
        createdAt: 1_720_100_000,
        updatedAt: 1_720_100_000,
      })
      prismaRef.current!.notepadNote.create.mockResolvedValue(row)

      const result = await createNote({
        ownerAccountId: 'user_alejandra',
        title: '  Customer call notes  ',
        body: 'Follow up with the Kingston logistics team',
        color: 'pink',
        pinned: true,
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        object: 'note',
        id: 'wnote_generated_01',
        owner_account_id: 'user_alejandra',
        title: 'Customer call notes',
        body: 'Follow up with the Kingston logistics team',
        color: 'yellow',
        pinned: false,
        created_at: 1_720_100_000,
        updated_at: 1_720_100_000,
      })
      expect(prismaRef.current!.notepadNote.create).toHaveBeenCalledTimes(1)
      expect(prismaRef.current!.notepadNote.create).toHaveBeenCalledWith({
        data: {
          id: 'wnote_generated_01',
          ownerAccountId: 'user_alejandra',
          title: 'Customer call notes',
          body: 'Follow up with the Kingston logistics team',
          color: 'pink',
          pinned: true,
          createdAt: 1_720_100_000,
          updatedAt: 1_720_100_000,
        },
      })
    })

    it('when title is blank, then does not touch the database', async () => {
      const result = await createNote({
        ownerAccountId: 'user_alejandra',
        title: '   ',
        body: 'ignored',
      })

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          code: 'widgets/invalid-title',
          status: 400,
        })
      )
      expect(prismaRef.current!.notepadNote.create).not.toHaveBeenCalled()
    })

    it('when owner account is blank, then rejects without creating a row', async () => {
      const result = await createNote({
        ownerAccountId: '  ',
        title: 'Valid title',
        body: '',
      })

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          code: 'widgets/missing-owner',
          status: 400,
        })
      )
      expect(prismaRef.current!.notepadNote.create).not.toHaveBeenCalled()
    })

    it('when color and pinned are omitted, then defaults to yellow and unpinned', async () => {
      prismaRef.current!.notepadNote.create.mockResolvedValue(
        createRow({ id: 'wnote_generated_01' })
      )

      await createNote({
        ownerAccountId: 'user_alejandra',
        title: 'Defaults',
        body: '',
      })

      expect(prismaRef.current!.notepadNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            color: 'yellow',
            pinned: false,
          }),
        })
      )
    })
  })

  describe('updateNote', () => {
    it('when the note belongs to the actor, then updates fields and returns the resource', async () => {
      const existing = createRow()
      const updated = createRow({
        title: 'Updated call notes',
        body: 'Rescheduled for Friday',
        color: 'blue',
        pinned: true,
        updatedAt: 1_720_100_000,
      })
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(existing)
      prismaRef.current!.notepadNote.update.mockResolvedValue(updated)

      const result = await updateNote({
        id: existing.id,
        ownerAccountId: 'user_alejandra',
        title: '  Updated call notes  ',
        body: 'Rescheduled for Friday',
        color: 'blue',
        pinned: true,
      })

      expect(result.error).toBeNull()
      expect(result.data?.title).toBe('Updated call notes')
      expect(result.data?.color).toBe('blue')
      expect(result.data?.pinned).toBe(true)
      expect(prismaRef.current!.notepadNote.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: {
          title: 'Updated call notes',
          body: 'Rescheduled for Friday',
          color: 'blue',
          pinned: true,
          updatedAt: 1_720_100_000,
        },
      })
    })

    it('when the note is missing, then returns widgets/note-not-found and skips update', async () => {
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(null)

      const result = await updateNote({
        id: 'wnote_missing',
        ownerAccountId: 'user_alejandra',
        title: 'Does not matter',
      })

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          code: 'widgets/note-not-found',
          status: 404,
        })
      )
      expect(prismaRef.current!.notepadNote.update).not.toHaveBeenCalled()
    })

    it('when the note belongs to another account, then hides it as not found', async () => {
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(
        createRow({ ownerAccountId: 'user_other' })
      )

      const result = await updateNote({
        id: 'wnote_existing_01',
        ownerAccountId: 'user_alejandra',
        title: 'Stolen edit',
      })

      if (result.error === null) throw new Error('Expected update to fail.')
      expect(result.code).toBe('widgets/note-not-found')
      expect(prismaRef.current!.notepadNote.update).not.toHaveBeenCalled()
    })

    it('when title becomes empty after trim, then rejects validation without writing', async () => {
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(createRow())

      const result = await updateNote({
        id: 'wnote_existing_01',
        ownerAccountId: 'user_alejandra',
        title: '   ',
      })

      if (result.error === null) throw new Error('Expected update to fail.')
      expect(result.code).toBe('widgets/invalid-title')
      expect(prismaRef.current!.notepadNote.update).not.toHaveBeenCalled()
    })
  })

  describe('adminUpdateNote', () => {
    it('when an admin edits any note, then writes an audit event in the same transaction', async () => {
      const existing = createRow({ ownerAccountId: 'user_target' })
      const updated = createRow({
        ownerAccountId: 'user_target',
        title: 'Admin corrected title',
        updatedAt: 1_720_100_000,
      })
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(existing)
      prismaRef.current!.notepadNote.update.mockResolvedValue(updated)

      const result = await adminUpdateNote({
        id: existing.id,
        actorUserId: 'user_console_admin',
        title: 'Admin corrected title',
      })

      expect(result.error).toBeNull()
      expect(result.data?.title).toBe('Admin corrected title')
      expect(prismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
      expect(prismaRef.current!.widgetAuditEvent.create).toHaveBeenCalledWith({
        data: {
          id: 'waudit_generated_01',
          widgetId: 'notepad',
          action: 'widgets.notepad.updated',
          resourceId: existing.id,
          actorUserId: 'user_console_admin',
          targetOwnerAccountId: 'user_target',
          occurredAt: 1_720_100_000,
        },
      })
    })
  })

  describe('deleteNote', () => {
    it('when the note belongs to the actor, then hard-deletes and returns a tombstone', async () => {
      const existing = createRow()
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(existing)
      prismaRef.current!.notepadNote.delete.mockResolvedValue(existing)

      const result = await deleteNote({
        id: existing.id,
        ownerAccountId: 'user_alejandra',
      })

      expect(result).toEqual({
        data: { object: 'note', id: existing.id, deleted: true },
        error: null,
      })
      expect(prismaRef.current!.notepadNote.delete).toHaveBeenCalledWith({
        where: { id: existing.id },
      })
    })

    it('when another account tries to delete the note, then returns not found and keeps the row', async () => {
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(
        createRow({ ownerAccountId: 'user_other' })
      )

      const result = await deleteNote({
        id: 'wnote_existing_01',
        ownerAccountId: 'user_alejandra',
      })

      if (result.error === null) throw new Error('Expected delete to fail.')
      expect(result.code).toBe('widgets/note-not-found')
      expect(prismaRef.current!.notepadNote.delete).not.toHaveBeenCalled()
    })
  })

  describe('adminDeleteNote', () => {
    it('when an admin deletes a note, then removes it and records widgets.notepad.deleted', async () => {
      const existing = createRow({ ownerAccountId: 'user_target' })
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(existing)
      prismaRef.current!.notepadNote.delete.mockResolvedValue(existing)

      const result = await adminDeleteNote({
        id: existing.id,
        actorUserId: 'user_console_admin',
      })

      expect(result.data).toEqual({
        object: 'note',
        id: existing.id,
        deleted: true,
      })
      expect(prismaRef.current!.widgetAuditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'widgets.notepad.deleted',
          actorUserId: 'user_console_admin',
          targetOwnerAccountId: 'user_target',
          resourceId: existing.id,
        }),
      })
    })
  })

  describe('listNotes', () => {
    it('when the owner has notes, then returns a list envelope ordered by recency', async () => {
      const rows = [
        createRow({ id: 'wnote_1', updatedAt: 200 }),
        createRow({ id: 'wnote_2', updatedAt: 100 }),
      ]
      prismaRef.current!.notepadNote.findMany.mockResolvedValue(rows)

      const result = await listNotes({
        ownerAccountId: 'user_alejandra',
        limit: 50,
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        object: 'list',
        data: rows.map((row) =>
          expect.objectContaining({ object: 'note', id: row.id })
        ),
        has_more: false,
        url: '/v1/notes',
        total_count: null,
      })
      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenCalledWith({
        where: { ownerAccountId: 'user_alejandra' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 51,
      })
    })

    it('when more rows exist than the limit, then sets has_more and trims the page', async () => {
      const rows = [
        createRow({ id: 'wnote_1' }),
        createRow({ id: 'wnote_2' }),
        createRow({ id: 'wnote_3' }),
      ]
      prismaRef.current!.notepadNote.findMany.mockResolvedValue(rows)

      const result = await listNotes({
        ownerAccountId: 'user_alejandra',
        limit: 2,
      })

      expect(result.data?.has_more).toBe(true)
      expect(result.data?.data).toHaveLength(2)
      expect(result.data?.data.map((note) => note.id)).toEqual([
        'wnote_1',
        'wnote_2',
      ])
    })

    it('when starting_after points at an owned cursor, then filters to older updatedAt values', async () => {
      prismaRef.current!.notepadNote.findUnique.mockResolvedValue(
        createRow({ id: 'wnote_cursor', updatedAt: 500 })
      )
      prismaRef.current!.notepadNote.findMany.mockResolvedValue([])

      await listNotes({
        ownerAccountId: 'user_alejandra',
        startingAfter: 'wnote_cursor',
        limit: 10,
      })

      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenCalledWith({
        where: {
          ownerAccountId: 'user_alejandra',
          updatedAt: { lt: 500 },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 11,
      })
    })

    it('when limit is out of range, then clamps between 1 and 100', async () => {
      prismaRef.current!.notepadNote.findMany.mockResolvedValue([])

      await listNotes({ ownerAccountId: 'user_alejandra', limit: 0 })
      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 2 })
      )

      await listNotes({ ownerAccountId: 'user_alejandra', limit: 500 })
      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 101 })
      )
    })
  })

  describe('listAllNotes', () => {
    it('when owner filter is provided, then scopes admin listing to that account', async () => {
      prismaRef.current!.notepadNote.findMany.mockResolvedValue([])

      const result = await listAllNotes({
        ownerAccountId: 'user_target',
        limit: 25,
      })

      expect(result.data?.url).toBe('/v1/admin/notes')
      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenCalledWith({
        where: { ownerAccountId: 'user_target' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 26,
      })
    })

    it('when no owner filter is provided, then lists across all accounts', async () => {
      prismaRef.current!.notepadNote.findMany.mockResolvedValue([])

      await listAllNotes({})

      expect(prismaRef.current!.notepadNote.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 51,
      })
    })
  })
})
