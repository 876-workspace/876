import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { service } = vi.hoisted(() => ({
  service: {
    listTemplates: vi.fn(),
    createTemplate: vi.fn(),
    retrieveTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    removeTemplate: vi.fn(),
    listTemplateVersions: vi.fn(),
    saveAsTemplate: vi.fn(),
    previewTemplate: vi.fn(),
    instantiateTemplate: vi.fn(),
    cloneProject: vi.fn(),
  },
}))

vi.mock('../templates.service.js', () => service)

const { createTemplatesRouter } = await import('../templates.routes.js')

const template = {
  object: 'projects.project-template',
  id: 'prjtpl_1',
  key: 'sprint-pack',
  name: 'Sprint pack',
  description: null,
  currentVersion: 1,
  sourceProjectId: null,
  counts: { phases: 1, taskLists: 0, workItems: 1, dependencies: 0 },
  createdAt: 1000,
  updatedAt: 2000,
}

const project = {
  object: 'projects.project',
  id: 'prj_new',
  key: 'NEW',
  name: 'New project',
}

async function requestRaw(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createTemplatesRouter())
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
    return { status: response.status, text: await response.text() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  service.listTemplates.mockResolvedValue({
    data: { items: [template], hasMore: false, totalCount: 1 },
    error: null,
  })
  service.createTemplate.mockResolvedValue({ data: template, error: null })
  service.retrieveTemplate.mockResolvedValue({ data: template, error: null })
  service.updateTemplate.mockResolvedValue({ data: template, error: null })
  service.removeTemplate.mockResolvedValue({
    data: { object: 'projects.project-template', id: 'prjtpl_1', deleted: true },
    error: null,
  })
  service.listTemplateVersions.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  service.saveAsTemplate.mockResolvedValue({ data: template, error: null })
  service.previewTemplate.mockResolvedValue({
    data: {
      object: 'projects.template-preview',
      startDate: 100,
      phases: [],
      workItems: [],
      missing: { workItemTypes: [], workflowStates: [], labels: [] },
    },
    error: null,
  })
  service.instantiateTemplate.mockResolvedValue({
    data: { project, replayed: false },
    error: null,
  })
  service.cloneProject.mockResolvedValue({
    data: { project, replayed: false },
    error: null,
  })
})

describe('templates routes', () => {
  it('rejects requests without the internal key', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_1/project-templates',
      undefined,
      { 'x-internal-key': 'wrong' },
    )
    expect(response.status).toBe(401)
  })

  it('lists templates as a list envelope', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_1/project-templates',
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text)).toEqual({
      data: {
        object: 'list',
        data: [template],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/project-templates',
      },
      error: null,
    })
  })

  it('creates a template with 201', async () => {
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/project-templates',
      { key: 'sprint-pack', name: 'Sprint pack', definition: { schemaVersion: 1 } },
    )
    expect(response.status).toBe(201)
    expect(JSON.parse(response.text).data).toEqual(template)
  })

  it('rejects an invalid create body with 400', async () => {
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/project-templates',
      { name: 'Missing key' },
    )
    expect(response.status).toBe(400)
    expect(service.createTemplate).not.toHaveBeenCalled()
  })

  it('retrieves a template', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_1/project-templates/prjtpl_1',
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data).toEqual(template)
  })

  it('updates a template', async () => {
    const response = await requestRaw(
      'PATCH',
      '/v1/organizations/org_1/project-templates/prjtpl_1',
      { name: 'Renamed' },
    )
    expect(response.status).toBe(200)
    expect(service.updateTemplate).toHaveBeenCalledOnce()
  })

  it('deletes a template with a tombstone', async () => {
    const response = await requestRaw(
      'DELETE',
      '/v1/organizations/org_1/project-templates/prjtpl_1',
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data).toEqual({
      object: 'projects.project-template',
      id: 'prjtpl_1',
      deleted: true,
    })
  })

  it('lists versions as a list envelope', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_1/project-templates/prjtpl_1/versions',
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data.object).toBe('list')
  })

  it('previews a template', async () => {
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/project-templates/prjtpl_1/preview',
      { startDate: 100 },
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data.object).toBe(
      'projects.template-preview',
    )
  })

  it('instantiates a template with 201 on first create', async () => {
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/project-templates/prjtpl_1/instantiate',
      { name: 'New project', startDate: 100 },
    )
    expect(response.status).toBe(201)
    expect(JSON.parse(response.text).data).toEqual(project)
  })

  it('instantiates a template with 200 on idempotent replay', async () => {
    service.instantiateTemplate.mockResolvedValue({
      data: { project, replayed: true },
      error: null,
    })
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/project-templates/prjtpl_1/instantiate',
      { name: 'New project', startDate: 100, idempotencyKey: 'key-1' },
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data).toEqual(project)
  })

  it('clones a project with 201', async () => {
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_1/projects/prj_src/clone',
      { name: 'Copy' },
    )
    expect(response.status).toBe(201)
    expect(service.cloneProject).toHaveBeenCalledOnce()
    expect(JSON.parse(response.text).data).toEqual(project)
  })
})
