import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  projectCustomFieldListSchema,
  projectCustomFieldSchema,
  projectCustomFieldValueListSchema,
} from '../types'
import { createProjectCustomFieldsResource } from './project-custom-fields'

describe('project custom fields resource', () => {
  const resource = createProjectCustomFieldsResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the project custom field endpoints and schemas', async () => {
    const input = {
      key: 'team',
      label: 'Team',
      fieldType: 'text' as const,
    }
    await resource.list('org 1')
    await resource.create('org 1', input)
    await resource.update('org 1', 'pcf/1', { label: 'Squad' })
    await resource.delete('org 1', 'pcf/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/project-custom-fields',
        signal: undefined,
      },
      projectCustomFieldListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/project-custom-fields',
        body: input,
        signal: undefined,
      },
      projectCustomFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/project-custom-fields/pcf%2F1',
        body: { label: 'Squad' },
        signal: undefined,
      },
      projectCustomFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/project-custom-fields/pcf%2F1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('reads and writes values through the project values endpoints', async () => {
    const input = { customFields: [{ fieldId: 'pcf_1', value: 'platform' }] }
    await resource.values.list('org 1', 'prj/1')
    await resource.values.set('org 1', 'prj/1', input)

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj%2F1/custom-field-values',
        signal: undefined,
      },
      projectCustomFieldValueListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'PUT',
        path: '/v1/organizations/org%201/projects/prj%2F1/custom-field-values',
        body: input,
        signal: undefined,
      },
      projectCustomFieldValueListSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/custom-field-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1')).resolves.toEqual({ data: null, error })
  })
})
