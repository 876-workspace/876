import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  customFieldListSchema,
  customFieldSchema,
  deletedSchema,
} from '../types'
import { createCustomFieldsResource } from './custom-fields'

describe('custom fields resource', () => {
  const resource = createCustomFieldsResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the custom field endpoints and schemas', async () => {
    const input = {
      key: 'impact',
      label: 'Impact',
      fieldType: 'select' as const,
    }
    await resource.list('org 1')
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'cf/1')
    await resource.update('org 1', 'cf/1', { required: true })
    await resource.delete('org 1', 'cf/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/custom-fields',
        signal: undefined,
      },
      customFieldListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-fields',
        body: input,
        signal: undefined,
      },
      customFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/custom-fields/cf%2F1',
        signal: undefined,
      },
      customFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/custom-fields/cf%2F1',
        body: { required: true },
        signal: undefined,
      },
      customFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/custom-fields/cf%2F1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/tenant-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1')).resolves.toEqual({ data: null, error })
  })
})
