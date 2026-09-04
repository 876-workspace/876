import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { customFieldValueListSchema, deletedSchema } from '../types'
import { createCustomFieldValuesResource } from './custom-field-values'

describe('custom field values resource', () => {
  const resource = createCustomFieldValuesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the issue-scoped custom field value endpoints and schemas', async () => {
    const input = { fieldId: 'cf_1', value: 'high', updatedBy: 'usr_1' }
    await resource.list('org 1', 'CONSOLE/12')
    await resource.set('org 1', 'CONSOLE/12', input)
    await resource.delete('org 1', 'CONSOLE/12', 'cf/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/issues/CONSOLE%2F12/custom-field-values',
        signal: undefined,
      },
      customFieldValueListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'PUT',
        path: '/v1/organizations/org%201/issues/CONSOLE%2F12/custom-field-values',
        body: input,
        signal: undefined,
      },
      expect.anything()
    )
    expect(requestMock.mock.calls[1]?.[2].safeParse(null).success).toBe(true)
    expect(
      requestMock.mock.calls[1]?.[2].safeParse({
        object: 'projects.custom-field-value',
      }).success
    ).toBe(false)
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/issues/CONSOLE%2F12/custom-field-values/cf%2F1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/issue-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1', 'CONSOLE-1')).resolves.toEqual({
      data: null,
      error,
    })
  })
})
