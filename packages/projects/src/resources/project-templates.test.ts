import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  projectSchema,
  projectTemplateListSchema,
  projectTemplateSchema,
  projectTemplateVersionListSchema,
  templatePreviewSchema,
} from '../types'
import { createProjectsResource } from './projects'
import { createProjectTemplatesResource } from './project-templates'

describe('project templates resource', () => {
  const requestMock = vi.mocked(request)
  const resource = createProjectTemplatesResource(
    buildRuntime({ internalKey: 'key' })
  )

  beforeEach(() => requestMock.mockReset())

  it('lists templates for an organization', async () => {
    await resource.list('org 1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/project-templates',
        signal: undefined
      },
      projectTemplateListSchema
    )
  })

  it('creates a template with a definition body', async () => {
    const input = {
      key: 'sprint-pack',
      name: 'Sprint pack',
      definition: { schemaVersion: 1 as const }
    }
    await resource.create('org_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/project-templates',
        body: input
      }),
      projectTemplateSchema
    )
  })

  it('retrieves a template by id', async () => {
    await resource.retrieve('org_1', 'tmpl/1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/project-templates/tmpl%2F1',
        signal: undefined
      },
      projectTemplateSchema
    )
  })

  it('updates a template with a PATCH body', async () => {
    const input = { name: 'Renamed' }
    await resource.update('org_1', 'tmpl_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org_1/project-templates/tmpl_1',
        body: input
      }),
      projectTemplateSchema
    )
  })

  it('deletes a template', async () => {
    await resource.delete('org_1', 'tmpl_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org_1/project-templates/tmpl_1',
        signal: undefined
      },
      projectTemplateSchema
    )
  })

  it('lists template versions', async () => {
    await resource.versions('org_1', 'tmpl_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/project-templates/tmpl_1/versions',
        signal: undefined
      },
      projectTemplateVersionListSchema
    )
  })

  it('previews a template without writing', async () => {
    const input = { startDate: 1788000000 }
    await resource.preview('org_1', 'tmpl_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/project-templates/tmpl_1/preview',
        body: input
      }),
      templatePreviewSchema
    )
  })

  it('forwards include flags on preview', async () => {
    const input = {
      startDate: 1788000000,
      includeWorkItems: false,
      includeDependencies: false,
      includeBudgets: false
    }
    await resource.preview('org_1', 'tmpl_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: input }),
      templatePreviewSchema
    )
  })

  it('instantiates a template into a project', async () => {
    const input = { name: 'New project', startDate: 1788000000 }
    await resource.instantiate('org_1', 'tmpl_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/project-templates/tmpl_1/instantiate',
        body: input
      }),
      projectSchema
    )
  })

  it('forwards the idempotency key on instantiate', async () => {
    const input = {
      name: 'New project',
      startDate: 1788000000,
      idempotencyKey: 'idem-1'
    }
    await resource.instantiate('org_1', 'tmpl_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: input }),
      projectSchema
    )
  })

  it('clones a project through the projects resource', async () => {
    const projects = createProjectsResource(buildRuntime({ internalKey: 'key' }))
    const input = { name: 'Copy' }
    await projects.clone('org_1', 'prj_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/clone',
        body: input
      }),
      projectSchema
    )
  })

  it('saves a project as a template', async () => {
    const projects = createProjectsResource(buildRuntime({ internalKey: 'key' }))
    const input = { key: 'src-pack' }
    await projects.saveAsTemplate('org_1', 'prj_1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/save-as-template',
        body: input
      }),
      projectTemplateSchema
    )
  })
})
