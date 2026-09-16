import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, workStructure, customFields } = vi.hoisted(() => ({
  repository: {
    listLayouts: vi.fn(),
    retrieveLayout: vi.fn(),
    createLayout: vi.fn(),
    updateLayout: vi.fn(),
    softDeleteLayout: vi.fn(),
    clearDefaultInScope: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  workStructure: {
    retrieveWorkItemType: vi.fn(),
    listCustomFields: vi.fn(),
    milestoneDetails: { listCustomFields: vi.fn() },
  },
  customFields: { listCustomFields: vi.fn() },
}))

vi.mock('../layouts.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../work-structure/index.js', () => workStructure)
vi.mock('../../custom-fields/index.js', () => customFields)

const service = await import('../layouts.service.js')

const SECOND = 1787767200n
const tenant = { id: 'prjten_1', organizationId: 'org_1' }

const mainSection = {
  key: 'main',
  title: 'Main',
  columns: 1 as const,
  fields: [{ fieldKey: 'title', width: 1 as const, visible: true }],
}

function layoutRow(overrides = {}) {
  return {
    id: 'lay_1',
    tenantId: tenant.id,
    entity: 'project',
    workItemTypeId: null,
    name: 'Default',
    definition: { sections: [mainSection], rules: [] },
    version: 1,
    isDefault: true,
    deletedAt: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  repository.listLayouts.mockResolvedValue([])
  repository.retrieveLayout.mockResolvedValue(null)
  repository.createLayout.mockImplementation(async (data) => data)
  repository.updateLayout.mockImplementation(async (_id, data) => ({
    ...layoutRow(),
    ...data,
  }))
  workStructure.retrieveWorkItemType.mockResolvedValue({
    data: { id: 'wit_1' },
    error: null,
  })
  workStructure.listCustomFields.mockResolvedValue({ data: [], error: null })
  workStructure.milestoneDetails.listCustomFields.mockResolvedValue({
    data: [],
    error: null,
  })
  customFields.listCustomFields.mockResolvedValue({ data: [], error: null })
})

describe('layouts service', () => {
  it('lists layouts filtered by entity', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow(),
      layoutRow({ id: 'lay_2', entity: 'phase', isDefault: false }),
    ])

    const result = await service.listLayouts('org_1', { entity: 'phase' })

    expect(result.error).toBeNull()
    expect(result.data?.map((layout) => layout.id)).toEqual(['lay_2'])
  })

  it('creates the first layout in a scope as default', async () => {
    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Default',
      sections: [mainSection],
    })

    expect(result.error).toBeNull()
    expect(repository.createLayout).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, isDefault: true })
    )
    expect(repository.clearDefaultInScope).toHaveBeenCalledWith(
      tenant.id,
      'project',
      null
    )
  })

  it('creates later layouts as non-default unless requested', async () => {
    repository.listLayouts.mockResolvedValue([layoutRow()])

    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Second',
      sections: [mainSection],
    })

    expect(result.data?.isDefault).toBe(false)
    expect(repository.clearDefaultInScope).not.toHaveBeenCalled()
  })

  it('clears sibling defaults when a new default arrives', async () => {
    repository.listLayouts.mockResolvedValue([layoutRow()])

    await service.createLayout('org_1', {
      entity: 'project',
      name: 'Replacement',
      sections: [mainSection],
      isDefault: true,
    })

    expect(repository.clearDefaultInScope).toHaveBeenCalledWith(
      tenant.id,
      'project',
      null
    )
  })

  it('rejects a work item type on non-work-item layouts', async () => {
    const result = await service.createLayout('org_1', {
      entity: 'project',
      workItemTypeId: 'wit_1',
      name: 'Bad scope',
      sections: [mainSection],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
    expect(repository.createLayout).not.toHaveBeenCalled()
  })

  it('rejects unknown work item types', async () => {
    workStructure.retrieveWorkItemType.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/work-item-type-not-found',
        message: 'missing',
        httpStatus: 404,
      },
    })

    const result = await service.createLayout('org_1', {
      entity: 'work-item',
      workItemTypeId: 'wit_missing',
      name: 'Typed',
      sections: [mainSection],
    })

    expect(result.error?.code).toBe('projects/work-item-type-not-found')
  })

  it('rejects unknown system field keys', async () => {
    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Bad keys',
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'titel', width: 1 as const, visible: true }],
        },
      ],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects custom keys without a matching field', async () => {
    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Bad custom',
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'cf:ghost', width: 1 as const, visible: true }],
        },
      ],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects unknown keys inside rules', async () => {
    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Bad rule',
      sections: [mainSection],
      rules: [
        {
          key: 'needs-x',
          when: [{ fieldKey: 'state', op: 'equals', value: 'active' }],
          then: [{ fieldKey: 'ghost', effect: 'require' }],
        },
      ],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('accepts declared custom field keys', async () => {
    customFields.listCustomFields.mockResolvedValue({
      data: [{ key: 'team', position: 2 }],
      error: null,
    })

    const result = await service.createLayout('org_1', {
      entity: 'project',
      name: 'Custom',
      sections: [
        {
          ...mainSection,
          fields: [
            { fieldKey: 'title', width: 1 as const, visible: true },
            { fieldKey: 'cf:team', width: 1 as const, visible: true },
          ],
        },
      ],
    })

    expect(result.error).toBeNull()
  })

  it('retrieves a layout by id', async () => {
    repository.retrieveLayout.mockResolvedValue(layoutRow())

    const result = await service.retrieveLayout('org_1', 'lay_1')

    expect(result.data).toMatchObject({
      object: 'projects.layout',
      id: 'lay_1',
      builtIn: false,
    })
  })

  it('reports layout-not-found for missing layouts', async () => {
    const result = await service.retrieveLayout('org_1', 'lay_missing')

    expect(result.error?.code).toBe('projects/layout-not-found')
  })

  it('bumps the version on update', async () => {
    repository.retrieveLayout.mockResolvedValue(layoutRow())

    await service.updateLayout('org_1', 'lay_1', { name: 'Renamed' })

    expect(repository.updateLayout).toHaveBeenCalledWith(
      'lay_1',
      expect.objectContaining({
        name: 'Renamed',
        version: { increment: 1 },
      })
    )
  })

  it('validates replacement sections on update', async () => {
    repository.retrieveLayout.mockResolvedValue(layoutRow())

    const result = await service.updateLayout('org_1', 'lay_1', {
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'nope', width: 1 as const, visible: true }],
        },
      ],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('soft-deletes layouts and returns a tombstone', async () => {
    repository.retrieveLayout.mockResolvedValue(layoutRow())

    const result = await service.removeLayout('org_1', 'lay_1')

    expect(result.error).toBeNull()
    expect(repository.softDeleteLayout).toHaveBeenCalledWith(
      'lay_1',
      expect.any(BigInt)
    )
    expect(result.data).toEqual({
      object: 'projects.layout',
      id: 'lay_1',
      deleted: true,
    })
  })

  it('makes a layout the scope default', async () => {
    repository.retrieveLayout.mockResolvedValue(
      layoutRow({ id: 'lay_2', isDefault: false })
    )

    const result = await service.makeDefaultLayout('org_1', 'lay_2')

    expect(result.error).toBeNull()
    expect(repository.clearDefaultInScope).toHaveBeenCalledWith(
      tenant.id,
      'project',
      null
    )
    expect(repository.updateLayout).toHaveBeenCalledWith(
      'lay_2',
      expect.objectContaining({ isDefault: true })
    )
  })

  it('resolves the type-specific layout first', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({ id: 'lay_entity', isDefault: true }),
      layoutRow({
        id: 'lay_typed',
        entity: 'work-item',
        workItemTypeId: 'wit_1',
        isDefault: true,
      }),
    ])

    const result = await service.resolveLayout('org_1', 'work-item', 'wit_1')

    expect(result.data?.id).toBe('lay_typed')
    expect(result.data?.builtIn).toBe(false)
  })

  it('falls back to the entity default for unknown types', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        id: 'lay_entity',
        entity: 'work-item',
        isDefault: true,
      }),
    ])

    const result = await service.resolveLayout('org_1', 'work-item', 'wit_9')

    expect(result.data?.id).toBe('lay_entity')
  })

  it('returns a built-in default instead of 404', async () => {
    const result = await service.resolveLayout('org_1', 'project')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.layout',
      id: null,
      entity: 'project',
      builtIn: true,
      isDefault: true,
    })
    expect(
      result.data?.sections[0]?.fields.map((field) => field.fieldKey)
    ).toContain('title')
  })

  it('orders built-in custom fields by position', async () => {
    customFields.listCustomFields.mockResolvedValue({
      data: [
        { key: 'zebra', position: 9 },
        { key: 'alpha', position: 1 },
      ],
      error: null,
    })

    const result = await service.resolveLayout('org_1', 'project')

    const keys = result.data?.sections[0]?.fields.map(
      (field) => field.fieldKey
    )
    expect(keys?.indexOf('cf:alpha')).toBeLessThan(
      keys?.indexOf('cf:zebra') ?? -1
    )
  })

  it('skips enforcement when no layout rules exist', async () => {
    const result = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: { title: 'Anything' },
    })

    expect(result.error).toBeNull()
  })

  it('requires fields activated by matching rules', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        definition: {
          sections: [
            {
              ...mainSection,
              fields: [
                { fieldKey: 'state', width: 1 as const, visible: true },
                { fieldKey: 'dueDate', width: 1 as const, visible: true },
              ],
            },
          ],
          rules: [
            {
              key: 'needs-due',
              when: [{ fieldKey: 'state', op: 'equals', value: 'active' }],
              then: [{ fieldKey: 'dueDate', effect: 'require' }],
            },
          ],
        },
      }),
    ])

    const missing = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: { state: 'active' },
    })

    expect(missing.error?.code).toBe('projects/layout-required-fields')
    expect(missing.error?.param).toBe('dueDate')

    const satisfied = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: { state: 'active', dueDate: '1700000000' },
    })
    expect(satisfied.error).toBeNull()

    const inactive = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: { state: 'planned' },
    })
    expect(inactive.error).toBeNull()
  })

  it('lists every missing required field in the error param', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        definition: {
          sections: [
            {
              ...mainSection,
              fields: [
                { fieldKey: 'title', width: 1 as const, visible: true },
                { fieldKey: 'description', width: 1 as const, visible: true },
              ],
            },
          ],
          rules: [
            {
              key: 'need-both',
              when: [],
              then: [
                { fieldKey: 'title', effect: 'require' },
                { fieldKey: 'description', effect: 'require' },
              ],
            },
          ],
        },
      }),
    ])

    const result = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: {},
    })

    expect(result.error?.code).toBe('projects/layout-required-fields')
    expect(result.error?.param).toBe('description,title')
  })

  it('ignores require on hidden fields', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        definition: {
          sections: [
            {
              ...mainSection,
              fields: [
                { fieldKey: 'state', width: 1 as const, visible: true },
                { fieldKey: 'dueDate', width: 1 as const, visible: true },
              ],
            },
          ],
          rules: [
            {
              key: 'hide-and-require',
              when: [{ fieldKey: 'state', op: 'equals', value: 'planned' }],
              then: [
                { fieldKey: 'dueDate', effect: 'hide' },
                { fieldKey: 'dueDate', effect: 'require' },
              ],
            },
          ],
        },
      }),
    ])

    const result = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: {},
      incoming: { state: 'planned' },
    })

    expect(result.error).toBeNull()
  })

  it('rejects changes to disabled fields', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        definition: {
          sections: [
            {
              ...mainSection,
              fields: [
                { fieldKey: 'state', width: 1 as const, visible: true },
                { fieldKey: 'title', width: 1 as const, visible: true },
              ],
            },
          ],
          rules: [
            {
              key: 'lock-title',
              when: [{ fieldKey: 'state', op: 'equals', value: 'active' }],
              then: [{ fieldKey: 'title', effect: 'disable' }],
            },
          ],
        },
      }),
    ])

    const changed = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: { state: 'active', title: 'Before' },
      incoming: { title: 'After' },
    })
    expect(changed.error?.code).toBe('projects/layout-field-disabled')
    expect(changed.error?.param).toBe('title')

    const untouched = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: { state: 'active', title: 'Before' },
      incoming: { state: 'active' },
    })
    expect(untouched.error).toBeNull()
  })

  it('treats absent disabled fields as unchanged', async () => {
    repository.listLayouts.mockResolvedValue([
      layoutRow({
        definition: {
          sections: [mainSection],
          rules: [
            {
              key: 'lock-title',
              when: [],
              then: [{ fieldKey: 'title', effect: 'disable' }],
            },
          ],
        },
      }),
    ])

    const result = await service.enforceLayoutRules({
      organizationId: 'org_1',
      entity: 'project',
      existing: { title: 'Before' },
      incoming: { title: 'Before' },
    })

    expect(result.error).toBeNull()
  })
})
