import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { presetListSchema } from '../types'
import { createPresetsResource } from './presets'

describe('presets resource', () => {
  const resource = createPresetsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the preset catalog endpoints and schemas', async () => {
    const input = { key: 'general' as const }
    await resource.list('org 1')
    await resource.apply('org 1', input)

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/presets',
        signal: undefined,
      },
      presetListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/presets/apply',
        body: input,
        signal: undefined,
      },
      expect.anything()
    )
    expect(requestMock.mock.calls[1]?.[2].safeParse(null).success).toBe(true)
    expect(requestMock.mock.calls[1]?.[2].safeParse({}).success).toBe(false)
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/tenant-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1')).resolves.toEqual({ data: null, error })
  })
})
