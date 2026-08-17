import { beforeEach, describe, expect, it, vi } from 'vitest'

const { models, transaction } = vi.hoisted(() => {
  function deleteManyModel() {
    return { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
  }

  const models = {
    app: deleteManyModel(),
    authorizationCode: deleteManyModel(),
    ssoConnection: deleteManyModel(),
    provisioningRun: deleteManyModel(),
    financeProvisioningOutbox: deleteManyModel(),
    communicationCall: deleteManyModel(),
    communicationMessage: deleteManyModel(),
    billingCustomerOutbox: deleteManyModel(),
    organization: { delete: vi.fn().mockResolvedValue({ id: 'org_7bQ2' }) },
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

const { purgeOrganization } = await import('../organizations.repository')

const ORG_ID = 'org_7bQ2'

describe('purgeOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transaction.mockImplementation(
      async (fn: (tx: typeof models) => Promise<unknown>) => await fn(models)
    )
    models.organization.delete.mockResolvedValue({ id: ORG_ID })
    for (const model of Object.values(models)) {
      if ('deleteMany' in model)
        model.deleteMany.mockResolvedValue({ count: 0 })
    }
  })

  describe('happy path', () => {
    it('reports success', async () => {
      await expect(purgeOrganization(ORG_ID)).resolves.toBe(true)
    })

    it('runs the whole purge inside a single transaction', async () => {
      await purgeOrganization(ORG_ID)

      expect(transaction).toHaveBeenCalledTimes(1)
    })

    it('deletes the org row last so the cascade removes the rest', async () => {
      await purgeOrganization(ORG_ID)

      expect(models.organization.delete).toHaveBeenCalledTimes(1)
      expect(models.organization.delete).toHaveBeenCalledWith({
        where: { id: ORG_ID },
      })
    })
  })

  describe('dependents that would block the delete', () => {
    it.each([
      ['app', 'organizationId'],
      ['ssoConnection', 'organizationId'],
    ] as const)('deletes every %s for the org', async (model, key) => {
      await purgeOrganization(ORG_ID)

      expect(models[model].deleteMany).toHaveBeenCalledTimes(1)
      expect(models[model].deleteMany).toHaveBeenCalledWith({
        where: { [key]: ORG_ID },
      })
    })

    it('deletes authorization codes, which key the org as orgId', async () => {
      await purgeOrganization(ORG_ID)

      expect(models.authorizationCode.deleteMany).toHaveBeenCalledWith({
        where: { orgId: ORG_ID },
      })
    })
  })

  describe('dependents with no foreign key', () => {
    it.each([
      'provisioningRun',
      'financeProvisioningOutbox',
      'communicationCall',
      'communicationMessage',
    ] as const)('deletes every %s for the org', async (model) => {
      await purgeOrganization(ORG_ID)

      expect(models[model].deleteMany).toHaveBeenCalledTimes(1)
      expect(models[model].deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      })
    })

    it('deletes only this org’s billing outbox rows, matched by subject', async () => {
      await purgeOrganization(ORG_ID)

      expect(models.billingCustomerOutbox.deleteMany).toHaveBeenCalledTimes(1)
      expect(models.billingCustomerOutbox.deleteMany).toHaveBeenCalledWith({
        where: { subjectType: 'organization', subjectId: ORG_ID },
      })
    })
  })

  describe('error handling', () => {
    it('returns false when the organization does not exist', async () => {
      const notFound = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      })
      Object.setPrototypeOf(
        notFound,
        (await import('@/db/generated/prisma/client')).Prisma
          .PrismaClientKnownRequestError.prototype
      )
      models.organization.delete.mockRejectedValue(notFound)

      await expect(purgeOrganization(ORG_ID)).resolves.toBe(false)
    })

    it('rethrows any other failure rather than reporting a purge', async () => {
      models.organization.delete.mockRejectedValue(
        new Error('connection terminated')
      )

      await expect(purgeOrganization(ORG_ID)).rejects.toThrow(
        'connection terminated'
      )
    })
  })
})
