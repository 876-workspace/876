import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const documentTemplate = {
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  }
  return {
    documentTemplate,
    brandingPreference: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    transaction: vi.fn(),
  }
})

vi.mock('@/db/client', () => ({
  prisma: {
    documentTemplate: mocks.documentTemplate,
    brandingPreference: mocks.brandingPreference,
    $transaction: mocks.transaction,
  },
}))

import { documentTemplatesRepository as repository } from './document-templates.repository'

const template = { id: 'dtpl_1', documentType: 'invoice', isDefault: false }

function createInput(overrides = {}) {
  return {
    id: 'dtpl_1',
    tenantId: 'ten_1',
    documentType: 'invoice' as const,
    name: 'Invoice',
    layout: 'standard',
    settings: {},
    isDefault: false,
    schemaVersion: 1,
    actorId: 'user_1',
    now: 100,
    ...overrides,
  }
}

describe('document template repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ documentTemplate: mocks.documentTemplate })
    )
    mocks.documentTemplate.count.mockResolvedValue(0)
    mocks.documentTemplate.create.mockResolvedValue(template)
    mocks.documentTemplate.findFirst.mockResolvedValue(template)
    mocks.documentTemplate.update.mockResolvedValue(template)
  })

  it('lists only live templates in tenant default-first creation order', async () => {
    await repository.list('ten_1', 'invoice')
    expect(mocks.documentTemplate.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', documentType: 'invoice', deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  })

  it('loads an individual template through tenant isolation and live filtering', async () => {
    await repository.retrieve('ten_1', 'dtpl_1')
    expect(mocks.documentTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'dtpl_1', tenantId: 'ten_1', deletedAt: null },
    })
  })

  it('makes the first template default and clears any competing live default transactionally', async () => {
    await repository.create(createInput())
    expect(mocks.documentTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'ten_1', documentType: 'invoice', deletedAt: null },
        data: expect.objectContaining({ isDefault: false }),
      })
    )
    expect(mocks.documentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: true, createdBy: 'user_1' }),
      })
    )
  })

  it('clears the prior default when an explicit default is created', async () => {
    mocks.documentTemplate.count.mockResolvedValue(4)
    await repository.create(createInput({ isDefault: true }))
    expect(mocks.documentTemplate.updateMany).toHaveBeenCalledTimes(1)
    expect(mocks.documentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: true }),
      })
    )
  })

  it('refuses to create a twenty-sixth live template', async () => {
    mocks.documentTemplate.count.mockResolvedValue(25)
    await expect(repository.create(createInput())).resolves.toBeNull()
    expect(mocks.documentTemplate.create).not.toHaveBeenCalled()
  })

  it('retries a concurrent first create as a non-default after the unique-index race', async () => {
    mocks.documentTemplate.create
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce(template)

    await expect(repository.create(createInput())).resolves.toEqual(template)

    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.documentTemplate.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: false }),
      })
    )
  })

  it('clears the previous default before setting a new default in one transaction', async () => {
    await repository.setDefault('ten_1', 'dtpl_1', 'user_1', 100)
    expect(mocks.documentTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'ten_1', documentType: 'invoice', deletedAt: null },
      })
    )
    expect(mocks.documentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dtpl_1' },
        data: expect.objectContaining({ isDefault: true }),
      })
    )
  })

  it('soft deletes only a live template in the requesting tenant', async () => {
    await repository.delete('ten_1', 'dtpl_1', 'user_1', 100, false)
    expect(mocks.documentTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'dtpl_1', tenantId: 'ten_1', deletedAt: null },
    })
    expect(mocks.documentTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: 100, isDefault: false }),
      })
    )
  })

  it('hard deletes the isolated live template when requested', async () => {
    await repository.delete('ten_1', 'dtpl_1', null, 100, true)
    expect(mocks.documentTemplate.delete).toHaveBeenCalledWith({
      where: { id: 'dtpl_1' },
    })
  })
})
