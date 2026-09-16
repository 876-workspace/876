import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { deletedSchema, layoutListSchema, layoutSchema } from '../types'
import { createLayoutsResource } from './layouts'

describe('layouts resource', () => {
  const resource = createLayoutsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the layout endpoints and schemas', async () => {
    const input = {
      entity: 'project' as const,
      name: 'Default',
      sections: [
        {
          key: 'main',
          title: 'Main',
          columns: 1 as const,
          fields: [{ fieldKey: 'title', width: 1 as const, visible: true }],
        },
      ],
    }
    await resource.list('org 1')
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'lay/1')
    await resource.update('org 1', 'lay/1', { name: 'Renamed' })
    await resource.delete('org 1', 'lay/1')
    await resource.makeDefault('org 1', 'lay/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/layouts',
        signal: undefined,
      },
      layoutListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/layouts',
        body: input,
        signal: undefined,
      },
      layoutSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/layouts/lay%2F1',
        signal: undefined,
      },
      layoutSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/layouts/lay%2F1',
        body: { name: 'Renamed' },
        signal: undefined,
      },
      layoutSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/layouts/lay%2F1',
        signal: undefined,
      },
      deletedSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      6,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/layouts/lay%2F1/make-default',
        signal: undefined,
      },
      layoutSchema
    )
  })

  it('serializes list filters into the query string', async () => {
    await resource.list('org 1', { entity: 'work-item', workItemTypeId: 'wit 1' })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/layouts?entity=work-item&workItemTypeId=wit+1',
        signal: undefined,
      },
      layoutListSchema
    )
  })

  it('resolves layouts through the resolve endpoint', async () => {
    await resource.resolve('org 1', {
      entity: 'work-item',
      workItemTypeId: 'wit_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/layouts/resolve?entity=work-item&workItemTypeId=wit_1',
        signal: undefined,
      },
      layoutSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/layout-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.retrieve('org_1', 'lay_missing')).resolves.toEqual({
      data: null,
      error,
    })
  })
})
