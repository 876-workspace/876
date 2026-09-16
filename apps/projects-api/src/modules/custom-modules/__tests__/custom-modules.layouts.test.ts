import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  customModuleKeyFromEntity,
  isCustomModuleEntity,
  layoutEntitySchema,
} from '../../layouts/layouts.schemas.js'

const { layoutsRepo, tenants, customModules, customFields, workStructure } = vi.hoisted(() => ({
  layoutsRepo: {
    listLayouts: vi.fn(),
    retrieveLayout: vi.fn(),
    createLayout: vi.fn(),
    updateLayout: vi.fn(),
    softDeleteLayout: vi.fn(),
    clearDefaultInScope: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  customModules: { listModuleFields: vi.fn() },
  customFields: { listCustomFields: vi.fn() },
  workStructure: {
    retrieveWorkItemType: vi.fn(),
    listCustomFields: vi.fn(),
    milestoneDetails: { listCustomFields: vi.fn() },
  },
}))

vi.mock('../../layouts/layouts.repository.js', () => layoutsRepo)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../index.js', () => customModules)
vi.mock('../../custom-fields/index.js', () => customFields)
vi.mock('../../work-structure/index.js', () => workStructure)

const layoutsService = await import('../../layouts/layouts.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const mainSection = {
  key: 'main',
  title: 'Main',
  columns: 1 as const,
  fields: [{ fieldKey: 'title', width: 1 as const, visible: true }],
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
  layoutsRepo.listLayouts.mockResolvedValue([])
  layoutsRepo.createLayout.mockImplementation(async (data) => ({ ...data, id: 'lay_1' }))
  customFields.listCustomFields.mockResolvedValue({ data: [], error: null })
  workStructure.listCustomFields.mockResolvedValue({ data: [], error: null })
  workStructure.milestoneDetails.listCustomFields.mockResolvedValue({ data: [], error: null })
  customModules.listModuleFields.mockResolvedValue({
    data: [{ key: 'severity', position: 0 }],
    error: null,
  })
})

describe('custom module layout entities', () => {
  it('accepts custom-module entity keys', () => {
    expect(layoutEntitySchema.parse('custom-module:risk-log')).toBe('custom-module:risk-log')
  })

  it('keeps the built-in entities', () => {
    for (const entity of ['project', 'phase', 'work-item']) {
      expect(layoutEntitySchema.parse(entity)).toBe(entity)
    }
  })

  it('rejects malformed custom module entities', () => {
    expect(() => layoutEntitySchema.parse('custom-module:Bad Key')).toThrow()
    expect(() => layoutEntitySchema.parse('custom-module:')).toThrow()
    expect(() => layoutEntitySchema.parse('sprint')).toThrow()
  })

  it('detects custom module entities', () => {
    expect(isCustomModuleEntity('custom-module:risk-log')).toBe(true)
    expect(isCustomModuleEntity('project')).toBe(false)
  })

  it('extracts the module key', () => {
    expect(customModuleKeyFromEntity('custom-module:risk-log')).toBe('risk-log')
    expect(customModuleKeyFromEntity('project')).toBeNull()
  })
})

describe('custom module layout validation', () => {
  it('accepts cf keys declared on the module', async () => {
    const result = await layoutsService.createLayout('org_1', {
      entity: 'custom-module:risk-log',
      name: 'Risk layout',
      sections: [
        {
          ...mainSection,
          fields: [...mainSection.fields, { fieldKey: 'cf:severity', width: 1 as const, visible: true }],
        },
      ],
    })
    expect(result.error).toBeNull()
    expect(customModules.listModuleFields).toHaveBeenCalledWith('org_1', 'risk-log')
  })

  it('rejects cf keys missing from the module', async () => {
    const result = await layoutsService.createLayout('org_1', {
      entity: 'custom-module:risk-log',
      name: 'Risk layout',
      sections: [
        {
          ...mainSection,
          fields: [...mainSection.fields, { fieldKey: 'cf:unknown', width: 1 as const, visible: true }],
        },
      ],
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects layouts for unknown modules', async () => {
    const { getError } = await import('../../../http/errors.js')
    customModules.listModuleFields.mockResolvedValue({
      data: null,
      error: getError('projects/custom-module-not-found'),
    })
    const result = await layoutsService.createLayout('org_1', {
      entity: 'custom-module:missing',
      name: 'Missing layout',
      sections: [mainSection],
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
  })
})
