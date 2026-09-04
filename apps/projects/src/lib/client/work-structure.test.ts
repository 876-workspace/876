import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  customFieldsClient,
  milestonesClient,
  workItemTypesClient,
  workflowStatesClient,
} from './projects'

const fetchMock = vi.fn<typeof globalThis.fetch>()

function response() {
  return new Response(
    JSON.stringify({ data: { id: 'resource_1' }, error: null }),
    {
      headers: { 'content-type': 'application/json' },
    }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(response())
})

function expectJsonCall(path: string, method: string, body: unknown) {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? []
  expect(url).toBe(path)
  expect(init?.method).toBe(method)
  expect(JSON.parse(init?.body as string)).toEqual(body)
}

describe('work-structure browser clients', () => {
  it('posts each configured resource through its same-origin route', async () => {
    await workItemTypesClient.create({
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#ef4444',
    })
    expectJsonCall('/api/work-item-types', 'POST', {
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#ef4444',
    })

    await workflowStatesClient.create({
      key: 'triage',
      name: 'Triage',
      category: 'backlog',
      color: '#6b7280',
    })
    expectJsonCall('/api/workflow-states', 'POST', {
      key: 'triage',
      name: 'Triage',
      category: 'backlog',
      color: '#6b7280',
    })

    await milestonesClient.create({
      projectId: 'project_1',
      key: 'v1',
      name: 'Version 1',
    })
    expectJsonCall('/api/milestones', 'POST', {
      projectId: 'project_1',
      key: 'v1',
      name: 'Version 1',
    })

    await customFieldsClient.create({
      key: 'customer',
      label: 'Customer',
      fieldType: 'text',
    })
    expectJsonCall('/api/custom-fields', 'POST', {
      key: 'customer',
      label: 'Customer',
      fieldType: 'text',
    })
  })

  it('patches and deletes an encoded work-item type id', async () => {
    await workItemTypesClient.update('type 1/x', { name: 'Bug' })
    expectJsonCall('/api/work-item-types/type%201%2Fx', 'PATCH', {
      name: 'Bug',
    })

    await workItemTypesClient.delete('type 1/x')
    const [url, init] = fetchMock.mock.calls.at(-1) ?? []
    expect(url).toBe('/api/work-item-types/type%201%2Fx')
    expect(init?.method).toBe('DELETE')
  })
})
