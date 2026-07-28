import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: {
    current: null as null | {
      notepadNote: {
        count: ReturnType<typeof vi.fn>
        groupBy: ReturnType<typeof vi.fn>
      }
      notepadCollection: {
        count: ReturnType<typeof vi.fn>
      }
    },
  },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

import { retrieveNotepadStats } from './notepad'

describe('retrieveNotepadStats', () => {
  beforeEach(() => {
    prismaRef.current = {
      notepadNote: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      notepadCollection: {
        count: vi.fn(),
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('when the database has data, then returns the complete stats object with correct 30-day boundary', async () => {
    const fakeNow = new Date('2024-06-15T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(fakeNow)

    const nowSeconds = Math.floor(fakeNow.getTime() / 1000)
    const thirtyDaysAgo = nowSeconds - 30 * 24 * 60 * 60

    prismaRef
      .current!.notepadNote.count// notes (total)
      .mockResolvedValueOnce(120)
      // pinned_notes
      .mockResolvedValueOnce(15)
      // filed_notes
      .mockResolvedValueOnce(40)
      // notes_created_last_30d
      .mockResolvedValueOnce(30)
      // notes_updated_last_30d
      .mockResolvedValueOnce(55)

    prismaRef
      .current!.notepadNote.groupBy// accounts (all distinct)
      .mockResolvedValueOnce([
        { ownerAccountId: 'user_a' },
        { ownerAccountId: 'user_b' },
        { ownerAccountId: 'user_c' },
      ])
      // active_accounts_last_30d
      .mockResolvedValueOnce([
        { ownerAccountId: 'user_a' },
        { ownerAccountId: 'user_b' },
      ])

    prismaRef.current!.notepadCollection.count.mockResolvedValueOnce(8)

    const result = await retrieveNotepadStats()

    expect(result).toEqual({
      data: {
        object: 'notepad_stats',
        notes: 120,
        collections: 8,
        accounts: 3,
        pinned_notes: 15,
        filed_notes: 40,
        notes_created_last_30d: 30,
        notes_updated_last_30d: 55,
        active_accounts_last_30d: 2,
        generated_at: nowSeconds,
      },
      error: null,
    })

    // Assert the 30-day boundary is computed correctly
    expect(prismaRef.current!.notepadNote.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: thirtyDaysAgo } },
    })
    expect(prismaRef.current!.notepadNote.count).toHaveBeenCalledWith({
      where: { updatedAt: { gte: thirtyDaysAgo } },
    })
    expect(prismaRef.current!.notepadNote.groupBy).toHaveBeenCalledWith({
      by: ['ownerAccountId'],
      where: { updatedAt: { gte: thirtyDaysAgo } },
    })
  })

  it('when the database is empty, then returns zeros for all counts', async () => {
    const fakeNow = new Date('2024-01-01T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(fakeNow)

    const nowSeconds = Math.floor(fakeNow.getTime() / 1000)

    prismaRef
      .current!.notepadNote.count.mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    prismaRef
      .current!.notepadNote.groupBy.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    prismaRef.current!.notepadCollection.count.mockResolvedValueOnce(0)

    const result = await retrieveNotepadStats()

    expect(result).toEqual({
      data: {
        object: 'notepad_stats',
        notes: 0,
        collections: 0,
        accounts: 0,
        pinned_notes: 0,
        filed_notes: 0,
        notes_created_last_30d: 0,
        notes_updated_last_30d: 0,
        active_accounts_last_30d: 0,
        generated_at: nowSeconds,
      },
      error: null,
    })
  })

  it('runs all queries concurrently in a single Promise.all call', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-01T00:00:00Z'))

    prismaRef.current!.notepadNote.count.mockResolvedValue(0)
    prismaRef.current!.notepadNote.groupBy.mockResolvedValue([])
    prismaRef.current!.notepadCollection.count.mockResolvedValue(0)

    await retrieveNotepadStats()

    // 5 count calls: total, pinned, filed, created_30d, updated_30d
    expect(prismaRef.current!.notepadNote.count).toHaveBeenCalledTimes(5)
    // 2 groupBy calls: all-accounts, active-accounts
    expect(prismaRef.current!.notepadNote.groupBy).toHaveBeenCalledTimes(2)
    expect(prismaRef.current!.notepadCollection.count).toHaveBeenCalledTimes(1)
  })

  it('queries for total notes without a where clause', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-01T00:00:00Z'))

    prismaRef.current!.notepadNote.count.mockResolvedValue(0)
    prismaRef.current!.notepadNote.groupBy.mockResolvedValue([])
    prismaRef.current!.notepadCollection.count.mockResolvedValue(0)

    await retrieveNotepadStats()

    expect(prismaRef.current!.notepadNote.count).toHaveBeenCalledWith()
    expect(prismaRef.current!.notepadCollection.count).toHaveBeenCalledWith()
    expect(prismaRef.current!.notepadNote.groupBy).toHaveBeenCalledWith({
      by: ['ownerAccountId'],
    })
  })
})
