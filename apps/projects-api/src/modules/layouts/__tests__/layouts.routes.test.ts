import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { layoutsRepo, tenants, workStructure, customFields } = vi.hoisted(
  () => ({
    layoutsRepo: {
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
  })
)

vi.mock('../layouts.repository.js', () => layoutsRepo)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../work-structure/index.js', () => workStructure)
vi.mock('../../custom-fields/index.js', () => customFields)

const { createLayoutsRouter } = await import('../layouts.routes.js')

const SECOND = 1787767200n
const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const ORG = '/v1/organizations/org_1'

const mainSection = {
  key: 'main',
  title: 'Main',
  columns: 1,
  fields: [{ fieldKey: 'title', width: 1, visible: true }],
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

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createLayoutsRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenants.resolveTenant.mockResolvedValue(tenant)
  layoutsRepo.listLayouts.mockResolvedValue([])
  layoutsRepo.retrieveLayout.mockResolvedValue(null)
  layoutsRepo.createLayout.mockImplementation(async (data) => ({
    ...layoutRow(),
    ...data,
  }))
  layoutsRepo.updateLayout.mockImplementation(async (_id, patch) => ({
    ...layoutRow(),
    ...((typeof patch === 'object' && patch !== null ? patch : {}) as Record<
      string,
      unknown
    >),
    version: 2,
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

describe('layout routes', () => {
  it('lists layouts as a platform list envelope', async () => {
    layoutsRepo.listLayouts.mockResolvedValue([layoutRow()])

    const { status, body } = await requestJson('GET', `${ORG}/layouts`)

    expect(status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.layout',
      id: 'lay_1',
      entity: 'project',
    })
  })

  it('filters the layout list by entity', async () => {
    layoutsRepo.listLayouts.mockResolvedValue([
      layoutRow(),
      layoutRow({ id: 'lay_2', entity: 'phase', isDefault: false }),
    ])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/layouts?entity=phase`
    )

    expect(status).toBe(200)
    expect(body.data.data.map((layout: { id: string }) => layout.id)).toEqual([
      'lay_2',
    ])
  })

  it('creates the first layout in a scope as default', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      name: 'Default',
      sections: [mainSection],
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.layout',
      entity: 'project',
      isDefault: true,
      version: 1,
    })
    expect(layoutsRepo.clearDefaultInScope).toHaveBeenCalledWith(
      tenant.id,
      'project',
      null
    )
  })

  it('rejects unknown field keys on create', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      name: 'Bad keys',
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'titel', width: 1, visible: true }],
        },
      ],
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(layoutsRepo.createLayout).not.toHaveBeenCalled()
  })

  it('rejects undeclared custom keys on create', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      name: 'Bad custom',
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'cf:ghost', width: 1, visible: true }],
        },
      ],
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
  })

  it('accepts declared custom keys on create', async () => {
    customFields.listCustomFields.mockResolvedValue({
      data: [{ key: 'team', position: 0 }],
      error: null,
    })

    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      name: 'Custom',
      sections: [
        {
          ...mainSection,
          fields: [
            { fieldKey: 'title', width: 1, visible: true },
            { fieldKey: 'cf:team', width: 1, visible: true },
          ],
        },
      ],
    })

    expect(status).toBe(201)
    expect(body.error).toBeNull()
  })

  it('rejects a work item type on non-work-item layouts', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      workItemTypeId: 'wit_1',
      name: 'Bad scope',
      sections: [mainSection],
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
  })

  it('rejects unknown work item types on create', async () => {
    workStructure.retrieveWorkItemType.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/work-item-type-not-found',
        message: 'missing',
        httpStatus: 404,
      },
    })

    const { status, body } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'work-item',
      workItemTypeId: 'wit_missing',
      name: 'Typed',
      sections: [mainSection],
    })

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/work-item-type-not-found')
  })

  it('rejects duplicate section keys on create', async () => {
    const { status } = await requestJson('POST', `${ORG}/layouts`, {
      entity: 'project',
      name: 'Dup sections',
      sections: [mainSection, mainSection],
    })

    expect(status).toBe(400)
    expect(layoutsRepo.createLayout).not.toHaveBeenCalled()
  })

  it('retrieves a layout by id', async () => {
    layoutsRepo.retrieveLayout.mockResolvedValue(layoutRow())

    const { status, body } = await requestJson('GET', `${ORG}/layouts/lay_1`)

    expect(status).toBe(200)
    expect(body.data).toMatchObject({ id: 'lay_1', version: 1 })
  })

  it('maps an unknown layout id to a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/layouts/lay_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/layout-not-found')
  })

  it('bumps the version on update', async () => {
    layoutsRepo.retrieveLayout.mockResolvedValue(layoutRow())

    const { status, body } = await requestJson('PATCH', `${ORG}/layouts/lay_1`, {
      name: 'Renamed',
    })

    expect(status).toBe(200)
    expect(body.data.version).toBe(2)
    expect(layoutsRepo.updateLayout).toHaveBeenCalledWith(
      'lay_1',
      expect.objectContaining({ version: { increment: 1 } })
    )
  })

  it('validates replacement sections on update', async () => {
    layoutsRepo.retrieveLayout.mockResolvedValue(layoutRow())

    const { status, body } = await requestJson('PATCH', `${ORG}/layouts/lay_1`, {
      sections: [
        {
          ...mainSection,
          fields: [{ fieldKey: 'ghost', width: 1, visible: true }],
        },
      ],
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(layoutsRepo.updateLayout).not.toHaveBeenCalled()
  })

  it('maps an unknown layout id to a 404 on update', async () => {
    const { status, body } = await requestJson('PATCH', `${ORG}/layouts/lay_missing`, {
      name: 'Renamed',
    })

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/layout-not-found')
  })

  it('soft-deletes layouts and returns a tombstone', async () => {
    layoutsRepo.retrieveLayout.mockResolvedValue(layoutRow())

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/layouts/lay_1`
    )

    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'projects.layout',
      id: 'lay_1',
      deleted: true,
    })
    expect(layoutsRepo.softDeleteLayout).toHaveBeenCalledWith(
      'lay_1',
      expect.any(BigInt)
    )
  })

  it('maps an unknown layout id to a 404 on delete', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/layouts/lay_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/layout-not-found')
  })

  it('makes a layout the scope default', async () => {
    layoutsRepo.retrieveLayout.mockResolvedValue(
      layoutRow({ isDefault: false })
    )
    layoutsRepo.updateLayout.mockImplementation(async (_id, patch) => ({
      ...layoutRow({ isDefault: false }),
      ...((typeof patch === 'object' && patch !== null ? patch : {}) as Record<
        string,
        unknown
      >),
    }))

    const { status, body } = await requestJson(
      'POST',
      `${ORG}/layouts/lay_1/make-default`
    )

    expect(status).toBe(200)
    expect(body.data.isDefault).toBe(true)
    expect(layoutsRepo.clearDefaultInScope).toHaveBeenCalledWith(
      tenant.id,
      'project',
      null
    )
  })

  it('maps an unknown layout id to a 404 on make-default', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/layouts/lay_missing/make-default`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/layout-not-found')
  })

  it('resolves the type-specific layout first', async () => {
    layoutsRepo.listLayouts.mockResolvedValue([
      layoutRow({
        id: 'lay_typed',
        entity: 'work-item',
        workItemTypeId: 'wit_1',
      }),
      layoutRow({ id: 'lay_entity', entity: 'work-item' }),
    ])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/layouts/resolve?entity=work-item&workItemTypeId=wit_1`
    )

    expect(status).toBe(200)
    expect(body.data.id).toBe('lay_typed')
    expect(body.data.builtIn).toBe(false)
  })

  it('falls back to the entity default for unknown types', async () => {
    layoutsRepo.listLayouts.mockResolvedValue([
      layoutRow({ id: 'lay_entity', entity: 'work-item' }),
    ])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/layouts/resolve?entity=work-item&workItemTypeId=wit_other`
    )

    expect(status).toBe(200)
    expect(body.data.id).toBe('lay_entity')
  })

  it('returns a built-in default instead of a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/layouts/resolve?entity=project`
    )

    expect(status).toBe(200)
    expect(body.data).toMatchObject({
      id: null,
      entity: 'project',
      builtIn: true,
      isDefault: true,
    })
    expect(
      body.data.sections[0].fields.map(
        (field: { fieldKey: string }) => field.fieldKey
      )
    ).toContain('title')
  })

  it('requires an entity when resolving', async () => {
    const { status } = await requestJson('GET', `${ORG}/layouts/resolve`)

    expect(status).toBe(400)
  })
})
