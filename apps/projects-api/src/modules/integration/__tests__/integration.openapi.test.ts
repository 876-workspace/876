import { describe, expect, it } from 'vitest'

import {
  buildIntegrationOpenApi,
  INTEGRATION_OPERATIONS,
} from '../integration.openapi.js'

describe('integration openapi registry', () => {
  it('registers stable operation ids', () => {
    const ids = INTEGRATION_OPERATIONS.map(
      (operation) => operation.operationId
    )
    expect(ids).toContain('integration.listProjects')
    expect(ids).toContain('integration.createWorkItem')
    expect(ids).toContain('integration.updateWorkItem')
    expect(ids).toContain('integration.listPhases')
    expect(ids).toContain('integration.createTimeEntry')
    expect(ids).toContain('integration.createWebhookEndpoint')
    expect(ids).toContain('integration.deleteWebhookEndpoint')
    expect(ids).toContain('integration.exportWorkItemsCsv')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every integration route family', () => {
    const paths = INTEGRATION_OPERATIONS.map((operation) => operation.path)
    for (const family of [
      '/v1/integration/projects',
      '/v1/integration/work-items',
      '/v1/integration/phases',
      '/v1/integration/time-entries',
      '/v1/integration/webhook-endpoints',
    ])
      expect(paths.some((path) => path.startsWith(family))).toBe(true)
  })

  it('requires a scope on every operation', () => {
    for (const operation of INTEGRATION_OPERATIONS)
      expect(operation.scopes.length).toBeGreaterThan(0)
  })

  it('builds a document with method entries per operation', () => {
    const document = buildIntegrationOpenApi()
    expect(document.openapi).toBe('3.1.0')
    expect(Object.keys(document.paths).length).toBeGreaterThan(5)
    const workItems = document.paths['/v1/integration/work-items'] as Record<
      string,
      { operationId: string }
    >
    expect(workItems.get.operationId).toBe('integration.listWorkItems')
    expect(workItems.post.operationId).toBe('integration.createWorkItem')
  })

  it('embeds zod-derived request schemas', () => {
    const document = buildIntegrationOpenApi()
    const entry = (
      document.paths['/v1/integration/work-items'] as Record<
        string,
        { requestBody?: { content: { 'application/json': { schema: unknown } } } }
      >
    ).post
    expect(
      entry.requestBody?.content['application/json'].schema
    ).toMatchObject({ type: 'object' })
  })

  it('exposes bearer security per scope', () => {
    const document = buildIntegrationOpenApi()
    const entry = (
      document.paths['/v1/integration/time-entries'] as Record<
        string,
        { security?: unknown }
      >
    ).get
    expect(entry.security).toEqual([
      { integrationBearer: ['time:read'] },
    ])
  })
})
