import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  customModuleFieldsClient,
  customModuleLinksClient,
  customModulesClient,
  customModuleStatusesClient,
  customRecordsClient,
  dashboardWidgetsClient,
} from './custom-modules'

const fetchMock = vi.fn<typeof globalThis.fetch>()

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'resource_1' }, error: null }))
})

function lastCall(): { url: unknown; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? []
  return { url, init: (init ?? {}) as RequestInit }
}

describe('custom module browser clients', () => {
  it('lists modules through the same-origin route', async () => {
    await customModulesClient.list()
    expect(lastCall().url).toBe('/api/custom-modules')
  })

  it('creates a module without naming an organization', async () => {
    await customModulesClient.create({
      scope: 'org',
      key: 'risks',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    const { url, init } = lastCall()
    expect(url).toBe('/api/custom-modules')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject({ key: 'risks' })
  })

  it('updates and deletes a module by id', async () => {
    await customModulesClient.update('cmod_1', { pluralName: 'Hazards' })
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1')
    await customModulesClient.remove('cmod_1')
    const { url, init } = lastCall()
    expect(url).toBe('/api/custom-modules/cmod_1')
    expect(init.method).toBe('DELETE')
  })

  it('creates and deletes module fields', async () => {
    await customModuleFieldsClient.create('cmod_1', {
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
    })
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/fields')
    await customModuleFieldsClient.remove('cmod_1', 'cmodf_1')
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/fields/cmodf_1')
  })

  it('replaces the status pipeline in one call', async () => {
    await customModuleStatusesClient.replace('cmod_1', [
      { key: 'triage', label: 'Triage', category: 'open' },
    ])
    const { url, init } = lastCall()
    expect(url).toBe('/api/custom-modules/cmod_1/statuses')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toMatchObject({
      statuses: [{ key: 'triage', label: 'Triage', category: 'open' }],
    })
  })

  it('creates, updates, and deletes records', async () => {
    await customRecordsClient.create('cmod_1', { title: 'Risk one' })
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/records')
    await customRecordsClient.update('cmod_1', 'cmodr_1', { title: 'Risk two' })
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/records/cmodr_1')
    await customRecordsClient.remove('cmod_1', 'cmodr_1')
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('creates and deletes record links', async () => {
    await customModuleLinksClient.create('cmod_1', 'cmodr_1', {
      targetType: 'work-item',
      targetId: 'issue_1',
      relation: 'relates-to',
    })
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/records/cmodr_1/links')
    await customModuleLinksClient.remove('cmod_1', 'cmodr_1', 'cmodl_1')
    expect(lastCall().url).toBe('/api/custom-modules/cmod_1/records/cmodr_1/links/cmodl_1')
  })

  it('manages dashboard widgets through the same-origin routes', async () => {
    await dashboardWidgetsClient.create({ kind: 'record-count', moduleId: 'cmod_1' })
    expect(lastCall().url).toBe('/api/dashboard-widgets')
    await dashboardWidgetsClient.update('dshw_1', { position: 2 })
    expect(lastCall().url).toBe('/api/dashboard-widgets/dshw_1')
    await dashboardWidgetsClient.remove('dshw_1')
    expect(lastCall().init.method).toBe('DELETE')
  })
})
