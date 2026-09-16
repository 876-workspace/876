import { describe, expect, it } from 'vitest'

import {
  createImportJobInputSchema,
  createIntegrationClientInputSchema,
  createWebhookEndpointInputSchema,
  exportTimeEntriesQuerySchema,
  exportWorkItemsQuerySchema,
  listWebhookDeliveriesQuerySchema,
  MAX_IMPORT_BYTES,
  updateWebhookEndpointInputSchema,
} from './integration-inputs'

describe('createIntegrationClientInputSchema', () => {
  it('accepts a name with one scope', () => {
    expect(
      createIntegrationClientInputSchema.safeParse({
        name: 'CI sync',
        scopes: ['projects:read'],
      }).success
    ).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(
      createIntegrationClientInputSchema.safeParse({ name: '  ', scopes: ['projects:read'] })
        .success
    ).toBe(false)
  })

  it('rejects zero scopes', () => {
    expect(
      createIntegrationClientInputSchema.safeParse({ name: 'CI', scopes: [] }).success
    ).toBe(false)
  })

  it('rejects an unknown scope', () => {
    expect(
      createIntegrationClientInputSchema.safeParse({ name: 'CI', scopes: ['admin:all'] })
        .success
    ).toBe(false)
  })

  it('rejects more than five scopes', () => {
    expect(
      createIntegrationClientInputSchema.safeParse({
        name: 'CI',
        scopes: [
          'projects:read',
          'projects:write',
          'time:read',
          'time:write',
          'webhooks:manage',
          'projects:read',
        ],
      }).success
    ).toBe(false)
  })
})

describe('webhook endpoint inputs', () => {
  it('accepts an https url with events', () => {
    expect(
      createWebhookEndpointInputSchema.safeParse({
        url: 'https://hooks.example.com/x',
        eventTypes: ['*'],
      }).success
    ).toBe(true)
  })

  it('rejects a plain http url', () => {
    expect(
      createWebhookEndpointInputSchema.safeParse({
        url: 'http://hooks.example.com/x',
        eventTypes: ['*'],
      }).success
    ).toBe(false)
  })

  it('rejects zero event types', () => {
    expect(
      createWebhookEndpointInputSchema.safeParse({
        url: 'https://hooks.example.com/x',
        eventTypes: [],
      }).success
    ).toBe(false)
  })

  it('rejects a short rotation secret', () => {
    expect(
      createWebhookEndpointInputSchema.safeParse({
        url: 'https://hooks.example.com/x',
        eventTypes: ['*'],
        secret: 'short',
      }).success
    ).toBe(false)
  })

  it('rejects an empty update', () => {
    expect(updateWebhookEndpointInputSchema.safeParse({}).success).toBe(false)
  })

  it('accepts an enabled-only update', () => {
    expect(
      updateWebhookEndpointInputSchema.safeParse({ enabled: false }).success
    ).toBe(true)
  })

  it('rejects an http url on update', () => {
    expect(
      updateWebhookEndpointInputSchema.safeParse({ url: 'http://x.example.com' })
        .success
    ).toBe(false)
  })
})

describe('listWebhookDeliveriesQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(listWebhookDeliveriesQuerySchema.safeParse({}).success).toBe(true)
  })

  it('accepts a status filter', () => {
    expect(
      listWebhookDeliveriesQuerySchema.safeParse({ status: 'failed' }).success
    ).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(
      listWebhookDeliveriesQuerySchema.safeParse({ status: 'succeeded' }).success
    ).toBe(false)
  })

  it('rejects a zero limit', () => {
    expect(
      listWebhookDeliveriesQuerySchema.safeParse({ limit: 0 }).success
    ).toBe(false)
  })

  it('rejects a limit above 100', () => {
    expect(
      listWebhookDeliveriesQuerySchema.safeParse({ limit: 101 }).success
    ).toBe(false)
  })
})

describe('createImportJobInputSchema', () => {
  it('accepts csv content', () => {
    expect(
      createImportJobInputSchema.safeParse({ source: 'csv', content: 'title\nShip\n' })
        .success
    ).toBe(true)
  })

  it('rejects an unknown source', () => {
    expect(
      createImportJobInputSchema.safeParse({ source: 'excel', content: 'x' }).success
    ).toBe(false)
  })

  it('rejects empty content', () => {
    expect(
      createImportJobInputSchema.safeParse({ source: 'csv', content: '' }).success
    ).toBe(false)
  })

  it('rejects content above 5 MB', () => {
    const content = `x,${'y'.repeat(MAX_IMPORT_BYTES)}`
    expect(
      createImportJobInputSchema.safeParse({ source: 'csv', content }).success
    ).toBe(false)
  })

  it('exposes a 5 MB ceiling', () => {
    expect(MAX_IMPORT_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('export query schemas', () => {
  it('accepts an empty work-items query', () => {
    expect(exportWorkItemsQuerySchema.safeParse({}).success).toBe(true)
  })

  it('rejects a negative time-entries from bound', () => {
    expect(
      exportTimeEntriesQuerySchema.safeParse({ from: -1 }).success
    ).toBe(false)
  })
})
