import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    requestForm: { update: vi.fn(), delete: vi.fn() },
    requestFormSubmission: { count: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../../../db/index.js', () => ({ prisma: mockPrisma }))

const repository = await import('../request-forms.repository.js')

const params = {
  id: 'crm_form_1',
  slug: 'support-intake',
  deletedBy: 'usr_1',
  reason: '  outdated  ',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'))
  delete process.env.DELETION_MODE
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('request-forms.repository - remove', () => {
  it('releases the slug so the name can be reused after a soft delete', async () => {
    await repository.remove(params)

    expect(mockPrisma.requestForm.update).toHaveBeenCalledTimes(1)
    const { data } = mockPrisma.requestForm.update.mock.calls[0][0]
    expect(data.slug).not.toBe('support-intake')
    expect(data.slug).toBe(
      `support-intake__deleted_${new Date('2026-08-28T12:00:00.000Z').getTime()}`
    )
  })

  it('keeps a released slug inside the column limit', async () => {
    await repository.remove({ ...params, slug: 'a'.repeat(100) })

    const { data } = mockPrisma.requestForm.update.mock.calls[0][0]
    expect(data.slug).toHaveLength(100)
  })

  it('archives the row and records the trimmed deletion reason', async () => {
    const tombstone = await repository.remove(params)

    const { where, data } = mockPrisma.requestForm.update.mock.calls[0][0]
    expect(where).toEqual({ id: 'crm_form_1' })
    expect(data.status).toBe('ARCHIVED')
    expect(data.deletedBy).toBe('usr_1')
    expect(data.deletionReason).toBe('outdated')
    expect(data.deletedAt).toEqual(new Date('2026-08-28T12:00:00.000Z'))
    expect(mockPrisma.requestForm.delete).not.toHaveBeenCalled()
    expect(tombstone).toEqual({
      object: 'request_form',
      id: 'crm_form_1',
      deleted: true,
    })
  })

  it('stores a null deletion reason when only whitespace was given', async () => {
    await repository.remove({ ...params, reason: '   ' })

    const { data } = mockPrisma.requestForm.update.mock.calls[0][0]
    expect(data.deletionReason).toBeNull()
  })

  it('hard-deletes the row without rewriting the slug when in hard mode', async () => {
    process.env.DELETION_MODE = 'hard'

    await repository.remove(params)

    expect(mockPrisma.requestForm.delete).toHaveBeenCalledWith({
      where: { id: 'crm_form_1' },
    })
    expect(mockPrisma.requestForm.update).not.toHaveBeenCalled()
  })
})
