import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { repository, tenants, projects } = vi.hoisted(() => ({
  repository: {
    listProjectCustomFields: vi.fn(),
    retrieveProjectCustomField: vi.fn(),
    retrieveProjectCustomFieldByKey: vi.fn(),
    createProjectCustomField: vi.fn(),
    updateProjectCustomField: vi.fn(),
    archiveProjectCustomField: vi.fn(),
    listProjectCustomFieldValues: vi.fn(),
    listProjectCustomFieldValuesForProjects: vi.fn(),
    upsertProjectCustomFieldValue: vi.fn(),
    clearProjectCustomFieldValue: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  projects: { resolveProject: vi.fn() },
}))

vi.mock('../project-custom-fields.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)

const {
  createProjectCustomFieldsRouter,
  createProjectCustomFieldValuesRouter,
} = await import('../project-custom-fields.routes.js')

const SECOND = 1787767200n
const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const project = { id: 'prj_1', tenantId: tenant.id, key: 'CONSOLE' }
const ORG = '/v1/organizations/org_1'

const textField = {
  id: 'pcf_1',
  tenantId: tenant.id,
  key: 'team',
  label: 'Team',
  fieldType: 'text',
  options: null,
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

function valueRow(overrides = {}) {
  return {
    id: 'pcfv_1',
    tenantId: tenant.id,
    projectId: project.id,
    fieldId: textField.id,
    stringValue: 'platform',
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    dateValue: null,
    selectKey: null,
    selectKeys: [],
    updatedBy: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    field: { key: 'team', fieldType: 'text' },
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
  app.use('/v1/organizations/:organizationId', createProjectCustomFieldsRouter())
  app.use(
    '/v1/organizations/:organizationId/projects',
    createProjectCustomFieldValuesRouter()
  )
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
  projects.resolveProject.mockResolvedValue(project)
  repository.listProjectCustomFields.mockResolvedValue([])
  repository.retrieveProjectCustomField.mockResolvedValue(textField)
  repository.retrieveProjectCustomFieldByKey.mockResolvedValue(null)
  repository.createProjectCustomField.mockImplementation(async (data) => data)
  repository.updateProjectCustomField.mockImplementation(
    async (_id, patch) => ({ ...textField, ...patch })
  )
  repository.listProjectCustomFieldValues.mockResolvedValue([])
})

describe('project custom field routes', () => {
  it('lists fields as a platform list envelope', async () => {
    repository.listProjectCustomFields.mockResolvedValue([textField])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/project-custom-fields`
    )

    expect(status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.project-custom-field',
      key: 'team',
    })
  })

  it('creates a field with a 201 status', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/project-custom-fields`,
      { key: 'team', label: 'Team', fieldType: 'text' }
    )

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.project-custom-field',
      key: 'team',
      required: false,
      position: 0,
    })
    expect(repository.createProjectCustomField).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenant.id, key: 'team' })
    )
  })

  it('maps a duplicate field key to a 409 conflict', async () => {
    repository.retrieveProjectCustomFieldByKey.mockResolvedValue(textField)

    const { status, body } = await requestJson(
      'POST',
      `${ORG}/project-custom-fields`,
      { key: 'team', label: 'Team', fieldType: 'text' }
    )

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/custom-field-key-taken')
  })

  it('rejects select fields without options', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/project-custom-fields`,
      { key: 'tier', label: 'Tier', fieldType: 'select' }
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(repository.createProjectCustomField).not.toHaveBeenCalled()
  })

  it('rejects options with duplicate keys', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/project-custom-fields`,
      {
        key: 'tier',
        label: 'Tier',
        fieldType: 'select',
        options: [
          { key: 'a', label: 'A' },
          { key: 'a', label: 'A again' },
        ],
      }
    )

    expect(status).toBe(400)
    expect(repository.createProjectCustomField).not.toHaveBeenCalled()
  })

  it('updates a field label', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/project-custom-fields/pcf_1`,
      { label: 'Squad' }
    )

    expect(status).toBe(200)
    expect(body.data.label).toBe('Squad')
  })

  it('maps an unknown field id to a 404 on update', async () => {
    repository.retrieveProjectCustomField.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/project-custom-fields/pcf_missing`,
      { label: 'Squad' }
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/custom-field-not-found')
  })

  it('rejects options on non-option field types', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/project-custom-fields/pcf_1`,
      { options: [{ key: 'a', label: 'A' }] }
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
  })

  it('archives fields on delete and returns a tombstone', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/project-custom-fields/pcf_1`
    )

    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'projects.project-custom-field',
      id: 'pcf_1',
      deleted: true,
    })
    expect(repository.archiveProjectCustomField).toHaveBeenCalledWith(
      'pcf_1',
      expect.any(BigInt)
    )
  })

  it('maps an unknown field id to a 404 on delete', async () => {
    repository.retrieveProjectCustomField.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/project-custom-fields/pcf_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/custom-field-not-found')
  })

  it('lists values for a project', async () => {
    repository.listProjectCustomFieldValues.mockResolvedValue([valueRow()])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_1/custom-field-values`
    )

    expect(status).toBe(200)
    expect(body.data.data).toMatchObject([
      {
        object: 'projects.project-custom-field-value',
        fieldKey: 'team',
        value: 'platform',
      },
    ])
  })

  it('maps values on a missing project to a 404', async () => {
    projects.resolveProject.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_missing/custom-field-values`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
  })

  it('sets values and returns the refreshed list', async () => {
    repository.listProjectCustomFields.mockResolvedValue([textField])
    repository.upsertProjectCustomFieldValue.mockResolvedValue(valueRow())
    repository.listProjectCustomFieldValues.mockResolvedValue([valueRow()])

    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      { customFields: [{ fieldId: 'pcf_1', value: 'platform' }] }
    )

    expect(status).toBe(200)
    expect(body.data.data).toMatchObject([
      {
        object: 'projects.project-custom-field-value',
        fieldKey: 'team',
        value: 'platform',
      },
    ])
    expect(repository.upsertProjectCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ fieldId: 'pcf_1', stringValue: 'platform' })
    )
  })

  it('rejects duplicate value inputs', async () => {
    repository.listProjectCustomFields.mockResolvedValue([textField])

    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      {
        customFields: [
          { fieldId: 'pcf_1', value: 'a' },
          { fieldId: 'pcf_1', value: 'b' },
        ],
      }
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
  })

  it('rejects values for unknown fields', async () => {
    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      { customFields: [{ fieldId: 'pcf_missing', value: 'a' }] }
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/custom-field-not-found')
  })

  it('rejects mistyped values', async () => {
    repository.listProjectCustomFields.mockResolvedValue([textField])

    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      { customFields: [{ fieldId: 'pcf_1', value: 42 }] }
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/custom-field-value-invalid')
  })

  it('requires required fields on set', async () => {
    repository.listProjectCustomFields.mockResolvedValue([
      { ...textField, required: true },
    ])

    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      { customFields: [] }
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/required-custom-field-missing')
  })

  it('clears stored values for empty inputs', async () => {
    repository.listProjectCustomFields.mockResolvedValue([textField])

    const { status } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/custom-field-values`,
      { customFields: [{ fieldId: 'pcf_1', value: null }] }
    )

    expect(status).toBe(200)
    expect(repository.clearProjectCustomFieldValue).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      'pcf_1'
    )
    expect(repository.upsertProjectCustomFieldValue).not.toHaveBeenCalled()
  })
})
