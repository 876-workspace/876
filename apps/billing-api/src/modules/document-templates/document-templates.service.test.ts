import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveBranding: vi.fn(),
  retrieveDefault: vi.fn(),
  setDefault: vi.fn(),
  update: vi.fn(),
  updateBranding: vi.fn(),
  getSettings: vi.fn(),
  generateId: vi.fn(),
}))

vi.mock('./document-templates.repository', () => ({
  documentTemplatesRepository: mocks,
}))
vi.mock('@/config', () => ({ getSettings: mocks.getSettings }))
vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

import { documentTemplatesService as service } from './document-templates.service'

const template = {
  id: 'dtpl_1',
  tenantId: 'ten_1',
  documentType: 'invoice',
  name: 'Invoice',
  layout: 'standard',
  isDefault: true,
  settings: {},
  schemaVersion: 1,
  createdAt: 1,
  updatedAt: 1,
}

function createBody(overrides = {}) {
  return {
    documentType: 'invoice' as const,
    name: 'Invoice',
    layout: 'standard' as const,
    settings: {},
    isDefault: false,
    ...overrides,
  }
}

describe('document template service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSettings.mockReturnValue({ deletionMode: 'soft' })
    mocks.generateId.mockReturnValue('dtpl_1')
    mocks.create.mockResolvedValue(template)
    mocks.retrieve.mockResolvedValue(template)
    mocks.update.mockResolvedValue(template)
    mocks.setDefault.mockResolvedValue(template)
    mocks.delete.mockResolvedValue(template)
    mocks.retrieveDefault.mockResolvedValue(template)
    mocks.retrieveBranding.mockResolvedValue(null)
    mocks.updateBranding.mockResolvedValue(null)
  })

  it('lists tenant rows in the established list envelope', async () => {
    mocks.list.mockResolvedValue([template])
    await expect(service.list('ten_1')).resolves.toMatchObject({
      object: 'list',
      data: [expect.objectContaining({ id: 'dtpl_1' })],
      has_more: false,
      total_count: 1,
    })
  })

  it('filters a list by document type', async () => {
    mocks.list.mockResolvedValue([])
    await service.list('ten_1', 'invoice')
    expect(mocks.list).toHaveBeenCalledWith('ten_1', 'invoice')
  })

  it('retrieves only the requested tenant template', async () => {
    await service.retrieve('ten_1', 'dtpl_1')
    expect(mocks.retrieve).toHaveBeenCalledWith('ten_1', 'dtpl_1')
  })

  it('maps a missing template to the registered not-found error', async () => {
    mocks.retrieve.mockResolvedValue(null)
    await expect(service.retrieve('ten_1', 'dtpl_other')).rejects.toMatchObject(
      { code: 'billing/document-template-not-found' }
    )
  })

  it('creates a supported template with the document-template id prefix', async () => {
    await service.create('ten_1', createBody(), 'user_1')
    expect(mocks.generateId).toHaveBeenCalledWith('DocumentTemplate')
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dtpl_1',
        tenantId: 'ten_1',
        schemaVersion: 1,
        actorId: 'user_1',
      })
    )
  })

  it('rejects a layout that does not support the document type', async () => {
    await expect(
      service.create('ten_1', createBody({ layout: 'retail' }), null)
    ).rejects.toMatchObject({
      code: 'billing/document-template-layout-unsupported',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('maps the repository limit result to the registered conflict', async () => {
    mocks.create.mockResolvedValue(null)
    await expect(
      service.create('ten_1', createBody(), null)
    ).rejects.toMatchObject({ code: 'billing/document-template-limit-reached' })
  })

  it('updates a tenant template', async () => {
    await service.update('ten_1', 'dtpl_1', { name: 'New name' }, 'user_1')
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'ten_1',
        id: 'dtpl_1',
        data: { name: 'New name' },
      })
    )
  })

  it('rejects an unsupported layout on update', async () => {
    await expect(
      service.update('ten_1', 'dtpl_1', { layout: 'retail' }, null)
    ).rejects.toMatchObject({
      code: 'billing/document-template-layout-unsupported',
    })
  })

  it('maps a concurrent missing update to not found', async () => {
    mocks.update.mockResolvedValue(null)
    await expect(
      service.update('ten_1', 'dtpl_1', { name: 'New name' }, null)
    ).rejects.toMatchObject({ code: 'billing/document-template-not-found' })
  })

  it('sets the default within the requested tenant', async () => {
    await service.setDefault('ten_1', 'dtpl_1', 'user_1')
    expect(mocks.setDefault).toHaveBeenCalledWith(
      'ten_1',
      'dtpl_1',
      'user_1',
      expect.any(Number)
    )
  })

  it('maps a missing default target to not found', async () => {
    mocks.setDefault.mockResolvedValue(null)
    await expect(
      service.setDefault('ten_1', 'dtpl_other', null)
    ).rejects.toMatchObject({ code: 'billing/document-template-not-found' })
  })

  it('soft deletes when configured for soft deletion', async () => {
    await service.delete('ten_1', 'dtpl_1', 'user_1')
    expect(mocks.delete).toHaveBeenCalledWith(
      'ten_1',
      'dtpl_1',
      'user_1',
      expect.any(Number),
      false
    )
  })

  it('hard deletes outside the soft-deletion mode', async () => {
    mocks.getSettings.mockReturnValue({ deletionMode: 'hard' })
    await service.delete('ten_1', 'dtpl_1', null)
    expect(mocks.delete).toHaveBeenCalledWith(
      'ten_1',
      'dtpl_1',
      null,
      expect.any(Number),
      true
    )
  })

  it('resolves an explicit template before the default', async () => {
    await service.resolve('ten_1', 'invoice', 'dtpl_1')
    expect(mocks.retrieve).toHaveBeenCalledWith('ten_1', 'dtpl_1')
    expect(mocks.retrieveDefault).not.toHaveBeenCalled()
  })

  it('resolves the default when no template id is supplied', async () => {
    await service.resolve('ten_1', 'invoice')
    expect(mocks.retrieveDefault).toHaveBeenCalledWith('ten_1', 'invoice')
  })

  it('falls back to the built-in layout when no default exists', async () => {
    mocks.retrieveDefault.mockResolvedValue(null)
    await expect(service.resolve('ten_1', 'invoice')).resolves.toMatchObject({
      templateId: null,
      layout: 'standard',
    })
  })

  it('degrades malformed stored settings to layout defaults', async () => {
    mocks.retrieve.mockResolvedValue({
      ...template,
      settings: { general: { fontSize: 'bad' } },
    })
    await expect(service.retrieve('ten_1', 'dtpl_1')).resolves.toMatchObject({
      resolvedSettings: { general: expect.objectContaining({ fontSize: 9 }) },
    })
  })

  it('deletes branding storage when a patch returns to defaults', async () => {
    await service.updateBranding('ten_1', { accentColor: '#2563eb' }, 'user_1')
    expect(mocks.updateBranding).toHaveBeenCalledWith(
      expect.objectContaining({ useDefaults: true })
    )
  })
})
