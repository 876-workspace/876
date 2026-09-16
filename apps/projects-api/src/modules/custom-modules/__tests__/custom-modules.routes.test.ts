import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { customModulesService } = vi.hoisted(() => ({
  customModulesService: {
    parseRoleKeysHeader: vi.fn((header?: string) =>
      (header ?? '').split(',').map((part) => part.trim()).filter((part) => part.length > 0)
    ),
    listModules: vi.fn(),
    createModule: vi.fn(),
    retrieveModule: vi.fn(),
    updateModule: vi.fn(),
    removeModule: vi.fn(),
    listModuleFields: vi.fn(),
    createModuleField: vi.fn(),
    updateModuleField: vi.fn(),
    removeModuleField: vi.fn(),
    listModuleStatuses: vi.fn(),
    createModuleStatus: vi.fn(),
    updateModuleStatus: vi.fn(),
    reorderModuleStatuses: vi.fn(),
    removeModuleStatus: vi.fn(),
    listRecords: vi.fn(),
    createRecord: vi.fn(),
    retrieveRecord: vi.fn(),
    updateRecord: vi.fn(),
    removeRecord: vi.fn(),
    listLinks: vi.fn(),
    createLink: vi.fn(),
    removeLink: vi.fn(),
    getStatusReport: vi.fn(),
    getFieldReport: vi.fn(),
    getCreatedReport: vi.fn(),
    listWidgets: vi.fn(),
    createWidget: vi.fn(),
    updateWidget: vi.fn(),
    removeWidget: vi.fn(),
  },
}))

vi.mock('../custom-modules.service.js', () => customModulesService)

const { createCustomModulesRouter } = await import('../custom-modules.routes.js')

const ORG = '/v1/organizations/org_1'

async function requestJson(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createCustomModulesRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-internal-key': 'test-internal-key', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json(), text: '' }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

async function requestCsv(path: string) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createCustomModulesRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { 'x-internal-key': 'test-internal-key' },
    })
    return { status: response.status, text: await response.text() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

const moduleResource = {
  object: 'projects.custom-module',
  id: 'cmod_1',
  scope: 'org',
  projectId: null,
  key: 'risk-log',
  singularName: 'Risk',
  pluralName: 'Risks',
  icon: null,
  version: 1,
  restrictedToRoleKeys: [],
  createdAt: 1,
  updatedAt: 1,
}

const recordResource = {
  object: 'projects.custom-record',
  id: 'cmodr_1',
  moduleId: 'cmod_1',
  moduleKey: 'risk-log',
  projectId: null,
  title: 'Risk one',
  statusKey: 'triage',
  fields: {},
  createdBy: null,
  updatedBy: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  customModulesService.listModules.mockResolvedValue({ data: [moduleResource], error: null })
  customModulesService.createModule.mockResolvedValue({ data: moduleResource, error: null })
  customModulesService.retrieveModule.mockResolvedValue({ data: moduleResource, error: null })
  customModulesService.updateModule.mockResolvedValue({ data: moduleResource, error: null })
  customModulesService.removeModule.mockResolvedValue({
    data: { object: 'projects.custom-module', id: 'cmod_1', deleted: true },
    error: null,
  })
  customModulesService.listModuleFields.mockResolvedValue({ data: [], error: null })
  customModulesService.createModuleField.mockResolvedValue({
    data: { object: 'projects.custom-module-field', id: 'cmodf_1' },
    error: null,
  })
  customModulesService.updateModuleField.mockResolvedValue({
    data: { object: 'projects.custom-module-field', id: 'cmodf_1' },
    error: null,
  })
  customModulesService.removeModuleField.mockResolvedValue({
    data: { object: 'projects.custom-module-field', id: 'cmodf_1', deleted: true },
    error: null,
  })
  customModulesService.listModuleStatuses.mockResolvedValue({ data: [], error: null })
  customModulesService.createModuleStatus.mockResolvedValue({
    data: { object: 'projects.custom-module-status', id: 'cmods_1' },
    error: null,
  })
  customModulesService.updateModuleStatus.mockResolvedValue({
    data: { object: 'projects.custom-module-status', id: 'cmods_1' },
    error: null,
  })
  customModulesService.reorderModuleStatuses.mockResolvedValue({ data: [], error: null })
  customModulesService.removeModuleStatus.mockResolvedValue({
    data: { object: 'projects.custom-module-status', id: 'cmods_1', deleted: true },
    error: null,
  })
  customModulesService.listRecords.mockResolvedValue({
    data: { items: [recordResource], hasMore: false, totalCount: 1 },
    error: null,
  })
  customModulesService.createRecord.mockResolvedValue({ data: recordResource, error: null })
  customModulesService.retrieveRecord.mockResolvedValue({ data: recordResource, error: null })
  customModulesService.updateRecord.mockResolvedValue({ data: recordResource, error: null })
  customModulesService.removeRecord.mockResolvedValue({
    data: { object: 'projects.custom-record', id: 'cmodr_1', deleted: true },
    error: null,
  })
  customModulesService.listLinks.mockResolvedValue({ data: [], error: null })
  customModulesService.createLink.mockResolvedValue({
    data: { object: 'projects.custom-module-link', id: 'cmodl_1' },
    error: null,
  })
  customModulesService.removeLink.mockResolvedValue({
    data: { object: 'projects.custom-module-link', id: 'cmodl_1', deleted: true },
    error: null,
  })
  customModulesService.getStatusReport.mockResolvedValue({
    data: {
      report: { object: 'projects.custom-module-status-report', moduleId: 'cmod_1', moduleKey: 'risk-log', total: 1, byStatus: [] },
      csv: 'status,label,count\r\n',
    },
    error: null,
  })
  customModulesService.getFieldReport.mockResolvedValue({
    data: {
      report: {
        object: 'projects.custom-module-field-report',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        fieldKey: 'severity',
        total: 1,
        byValue: [],
      },
      csv: 'value,label,count\r\n',
    },
    error: null,
  })
  customModulesService.getCreatedReport.mockResolvedValue({
    data: {
      report: {
        object: 'projects.custom-module-created-report',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        from: 0,
        to: 10,
        total: 0,
        perDay: [],
      },
      csv: 'day,count\r\n',
    },
    error: null,
  })
  customModulesService.listWidgets.mockResolvedValue({ data: [], error: null })
  customModulesService.createWidget.mockResolvedValue({
    data: { object: 'projects.dashboard-widget', id: 'dshw_1' },
    error: null,
  })
  customModulesService.updateWidget.mockResolvedValue({
    data: { object: 'projects.dashboard-widget', id: 'dshw_1' },
    error: null,
  })
  customModulesService.removeWidget.mockResolvedValue({
    data: { object: 'projects.dashboard-widget', id: 'dshw_1', deleted: true },
    error: null,
  })
})

describe('custom module definition routes', () => {
  it('lists modules as a list object', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules`)
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(customModulesService.listModules).toHaveBeenCalledTimes(1)
  })

  it('creates a module with 201', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules`, {
      scope: 'org',
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    expect(response.status).toBe(201)
    expect(customModulesService.createModule).toHaveBeenCalledTimes(1)
  })

  it('rejects module creation without the internal key', async () => {
    const app = express()
    app.use(express.json())
    app.use('/v1/organizations/:organizationId', createCustomModulesRouter())
    app.use(errorHandler)
    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No port')
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}${ORG}/custom-modules`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope: 'org', key: 'k', singularName: 'S', pluralName: 'P' }),
      })
      expect(response.status).toBe(401)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('rejects invalid module bodies with 400', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules`, { scope: 'org' })
    expect(response.status).toBe(400)
  })

  it('retrieves a module', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1`)
    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('cmod_1')
  })

  it('resolves a module by key', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/by-key/risk-log`)
    expect(response.status).toBe(200)
    expect(response.body.data.key).toBe('risk-log')
  })

  it('updates a module', async () => {
    const response = await requestJson('PATCH', `${ORG}/custom-modules/cmod_1`, { singularName: 'Hazard' })
    expect(response.status).toBe(200)
  })

  it('deletes a module', async () => {
    const response = await requestJson('DELETE', `${ORG}/custom-modules/cmod_1`)
    expect(response.status).toBe(200)
    expect(response.body.data.deleted).toBe(true)
  })
})

describe('custom module field routes', () => {
  it('lists fields', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/fields`)
    expect(response.status).toBe(200)
    expect(customModulesService.listModuleFields).toHaveBeenCalledTimes(1)
  })

  it('creates a field with 201', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules/cmod_1/fields`, {
      key: 'owner',
      label: 'Owner',
      fieldType: 'text',
    })
    expect(response.status).toBe(201)
  })

  it('updates a field', async () => {
    const response = await requestJson('PATCH', `${ORG}/custom-modules/cmod_1/fields/cmodf_1`, { label: 'Owner 2' })
    expect(response.status).toBe(200)
  })

  it('deletes a field', async () => {
    const response = await requestJson('DELETE', `${ORG}/custom-modules/cmod_1/fields/cmodf_1`)
    expect(response.status).toBe(200)
  })
})

describe('custom module status routes', () => {
  it('lists statuses', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/statuses`)
    expect(response.status).toBe(200)
  })

  it('creates a status with 201', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules/cmod_1/statuses`, {
      key: 'triage',
      label: 'Triage',
      category: 'open',
    })
    expect(response.status).toBe(201)
  })

  it('reorders statuses', async () => {
    const response = await requestJson('PATCH', `${ORG}/custom-modules/cmod_1/statuses/reorder`, {
      orderedIds: ['cmods_1'],
    })
    expect(response.status).toBe(200)
    expect(customModulesService.reorderModuleStatuses).toHaveBeenCalledTimes(1)
  })

  it('updates a status', async () => {
    const response = await requestJson('PATCH', `${ORG}/custom-modules/cmod_1/statuses/cmods_1`, { label: 'Triage 2' })
    expect(response.status).toBe(200)
  })

  it('deletes a status', async () => {
    const response = await requestJson('DELETE', `${ORG}/custom-modules/cmod_1/statuses/cmods_1`)
    expect(response.status).toBe(200)
  })
})

describe('custom record routes', () => {
  it('lists records with cursor envelope', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/records?limit=10&status=triage`)
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.total_count).toBe(1)
  })

  it('forwards the interim role-keys header', async () => {
    await requestJson('GET', `${ORG}/custom-modules/cmod_1/records`, undefined, { 'x-app-role-keys': 'admin' })
    expect(customModulesService.parseRoleKeysHeader).toHaveBeenCalledWith('admin')
  })

  it('creates a record with 201', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules/cmod_1/records`, { title: 'Risk one' })
    expect(response.status).toBe(201)
    expect(response.body.data.id).toBe('cmodr_1')
  })

  it('rejects record creation with a blank title', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules/cmod_1/records`, { title: '' })
    expect(response.status).toBe(400)
  })

  it('retrieves a record', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/records/cmodr_1`)
    expect(response.status).toBe(200)
  })

  it('updates a record', async () => {
    const response = await requestJson('PATCH', `${ORG}/custom-modules/cmod_1/records/cmodr_1`, { title: 'Risk two' })
    expect(response.status).toBe(200)
    expect(customModulesService.updateRecord).toHaveBeenCalledTimes(1)
  })

  it('deletes a record', async () => {
    const response = await requestJson('DELETE', `${ORG}/custom-modules/cmod_1/records/cmodr_1`)
    expect(response.status).toBe(200)
    expect(response.body.data.deleted).toBe(true)
  })
})

describe('custom record link routes', () => {
  it('lists links', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/records/cmodr_1/links`)
    expect(response.status).toBe(200)
  })

  it('creates a link with 201', async () => {
    const response = await requestJson('POST', `${ORG}/custom-modules/cmod_1/records/cmodr_1/links`, {
      targetType: 'work-item',
      targetId: 'iss_1',
      relation: 'relates-to',
    })
    expect(response.status).toBe(201)
  })

  it('deletes a link', async () => {
    const response = await requestJson('DELETE', `${ORG}/custom-modules/cmod_1/records/cmodr_1/links/cmodl_1`)
    expect(response.status).toBe(200)
  })
})

describe('custom module report routes', () => {
  it('returns the status report as JSON', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/reports/by-status`)
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('projects.custom-module-status-report')
  })

  it('returns the status report as CSV', async () => {
    const response = await requestCsv(`${ORG}/custom-modules/cmod_1/reports/by-status?format=csv`)
    expect(response.status).toBe(200)
    expect(response.text).toContain('status')
  })

  it('returns the field report as JSON', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/reports/by-field?fieldKey=severity`)
    expect(response.status).toBe(200)
  })

  it('returns the created report as JSON', async () => {
    const response = await requestJson('GET', `${ORG}/custom-modules/cmod_1/reports/created?from=0&to=10`)
    expect(response.status).toBe(200)
  })
})

describe('dashboard widget routes', () => {
  it('lists widgets', async () => {
    const response = await requestJson('GET', `${ORG}/dashboard-widgets`)
    expect(response.status).toBe(200)
  })

  it('creates a widget with 201', async () => {
    const response = await requestJson('POST', `${ORG}/dashboard-widgets`, {
      kind: 'record-count',
      moduleId: 'cmod_1',
    })
    expect(response.status).toBe(201)
  })

  it('updates a widget', async () => {
    const response = await requestJson('PATCH', `${ORG}/dashboard-widgets/dshw_1`, { position: 2 })
    expect(response.status).toBe(200)
  })

  it('deletes a widget', async () => {
    const response = await requestJson('DELETE', `${ORG}/dashboard-widgets/dshw_1`)
    expect(response.status).toBe(200)
  })

  it('rejects widget creation with an unknown kind', async () => {
    const response = await requestJson('POST', `${ORG}/dashboard-widgets`, { kind: 'pie', moduleId: 'cmod_1' })
    expect(response.status).toBe(400)
  })
})
