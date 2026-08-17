import { beforeEach, describe, expect, it, vi } from 'vitest'

const { models, transaction } = vi.hoisted(() => {
  function deleteManyModel() {
    return { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
  }
  function detachableModel() {
    return {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    }
  }

  const models = {
    authAttempt: deleteManyModel(),
    auditEvent: deleteManyModel(),
    communicationCall: deleteManyModel(),
    communicationMessage: deleteManyModel(),
    billingCustomerOutbox: detachableModel(),
    orgContact: detachableModel(),
    organization: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
    },
    user: { delete: vi.fn().mockResolvedValue({ id: 'user_2kL9mN4q' }) },
  }

  return {
    models,
    transaction: vi.fn(
      async (fn: (tx: typeof models) => Promise<unknown>) => await fn(models)
    ),
  }
})

vi.mock('@/db/client', () => ({
  prisma: { ...models, $transaction: transaction },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { purgeUser } = await import('../users.repository')

const USER_ID = 'user_2kL9mN4q'

describe('purgeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transaction.mockImplementation(
      async (fn: (tx: typeof models) => Promise<unknown>) => await fn(models)
    )
    models.user.delete.mockResolvedValue({ id: USER_ID })
    for (const model of Object.values(models)) {
      if ('deleteMany' in model)
        model.deleteMany.mockResolvedValue({ count: 0 })
      if ('updateMany' in model)
        model.updateMany.mockResolvedValue({ count: 0 })
    }
  })

  describe('happy path', () => {
    it('reports success', async () => {
      await expect(purgeUser(USER_ID)).resolves.toBe(true)
    })

    it('runs the whole purge inside a single transaction', async () => {
      await purgeUser(USER_ID)

      expect(transaction).toHaveBeenCalledTimes(1)
    })

    it('deletes the user row last so the cascade removes the rest', async () => {
      await purgeUser(USER_ID)

      expect(models.user.delete).toHaveBeenCalledTimes(1)
      expect(models.user.delete).toHaveBeenCalledWith({
        where: { id: USER_ID },
      })
    })
  })

  describe('records about this user are deleted', () => {
    it.each([
      'authAttempt',
      'auditEvent',
      'communicationCall',
      'communicationMessage',
    ] as const)('deletes every %s for the user', async (model) => {
      await purgeUser(USER_ID)

      expect(models[model].deleteMany).toHaveBeenCalledTimes(1)
      expect(models[model].deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
    })

    it('deletes only this user’s billing outbox rows, matched by subject', async () => {
      await purgeUser(USER_ID)

      expect(models.billingCustomerOutbox.deleteMany).toHaveBeenCalledWith({
        where: { subjectType: 'user', subjectId: USER_ID },
      })
    })
  })

  describe('records owned by an organization are detached, never deleted', () => {
    it('clears the user reference on org contacts instead of removing them', async () => {
      await purgeUser(USER_ID)

      expect(models.orgContact.updateMany).toHaveBeenCalledTimes(1)
      expect(models.orgContact.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { userId: null },
      })
      expect(models.orgContact.deleteMany).not.toHaveBeenCalled()
    })

    it('clears the primary contact on organizations instead of removing them', async () => {
      await purgeUser(USER_ID)

      expect(models.organization.updateMany).toHaveBeenCalledTimes(1)
      expect(models.organization.updateMany).toHaveBeenCalledWith({
        where: { primaryContactUserId: USER_ID },
        data: { primaryContactUserId: null },
      })
    })

    it('never deletes an organization when a user is purged', async () => {
      await purgeUser(USER_ID)

      expect(models.organization.delete).not.toHaveBeenCalled()
      expect(models.organization.deleteMany).not.toHaveBeenCalled()
    })

    it('clears the outbox contact reference instead of dropping another subject’s row', async () => {
      await purgeUser(USER_ID)

      expect(models.billingCustomerOutbox.updateMany).toHaveBeenCalledWith({
        where: { contactUserId: USER_ID },
        data: { contactUserId: null },
      })
    })
  })

  describe('error handling', () => {
    it('returns false when the user does not exist', async () => {
      const notFound = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      })
      Object.setPrototypeOf(
        notFound,
        (await import('@/db/generated/prisma/client')).Prisma
          .PrismaClientKnownRequestError.prototype
      )
      models.user.delete.mockRejectedValue(notFound)

      await expect(purgeUser(USER_ID)).resolves.toBe(false)
    })

    it('rethrows any other failure rather than reporting a purge', async () => {
      models.user.delete.mockRejectedValue(new Error('connection terminated'))

      await expect(purgeUser(USER_ID)).rejects.toThrow('connection terminated')
    })
  })
})
