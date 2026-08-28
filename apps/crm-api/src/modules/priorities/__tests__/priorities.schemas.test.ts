import { describe, expect, it } from 'vitest'

import {
  createPriorityBodySchema,
  deletePriorityBodySchema,
  listPrioritiesQuerySchema,
  priorityParamsSchema,
  updatePriorityBodySchema,
} from '../priorities.schemas.js'

describe('priority schemas', () => {
  it('parses create fields and trims strings', () => {
    expect(
      createPriorityBodySchema.parse({
        name: '  Critical  ',
        description: '  Immediate response  ',
        color: ' #dc2626 ',
        icon: ' alert ',
        weight: 50,
        sortOrder: 40,
        isDefault: false,
        isActive: true,
        createdBy: ' usr_1 ',
      })
    ).toEqual({
      name: 'Critical',
      description: 'Immediate response',
      color: '#dc2626',
      icon: 'alert',
      weight: 50,
      sortOrder: 40,
      isDefault: false,
      isActive: true,
      createdBy: 'usr_1',
    })
  })

  it('rejects missing names, out-of-range weights, and unknown fields', () => {
    expect(() =>
      createPriorityBodySchema.parse({ createdBy: 'usr_1' })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({
        name: 'Critical',
        weight: -1,
        createdBy: 'usr_1',
      })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({
        name: 'Critical',
        createdBy: 'usr_1',
        priority: 'URGENT',
      })
    ).toThrow()
  })

  it('requires at least one update field', () => {
    expect(() => updatePriorityBodySchema.parse({})).toThrow()
    expect(updatePriorityBodySchema.parse({ weight: 60 })).toEqual({
      weight: 60,
    })
  })

  it('parses tenant-scoped params and list active filter', () => {
    expect(
      priorityParamsSchema.parse({
        organizationId: ' org_1 ',
        priorityId: ' crm_pri_1 ',
      })
    ).toEqual({ organizationId: 'org_1', priorityId: 'crm_pri_1' })
    expect(listPrioritiesQuerySchema.parse({ active: 'true' })).toEqual({
      active: true,
    })
    expect(listPrioritiesQuerySchema.parse({ active: 'false' })).toEqual({
      active: false,
    })
  })

  it('requires deletion attribution', () => {
    expect(deletePriorityBodySchema.parse({ deletedBy: ' usr_1 ' })).toEqual({
      deletedBy: 'usr_1',
    })
    expect(() => deletePriorityBodySchema.parse({})).toThrow()
  })
})
