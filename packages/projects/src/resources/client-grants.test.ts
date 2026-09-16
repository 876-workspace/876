import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { clientGrantListSchema, clientGrantSchema } from '../types'
import { createClientGrantsResource } from './client-grants'

describe('client grants resource', () => {
  const resource = createClientGrantsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists grants including revoked', async () => {
    await resource.list('org_1', 'prj_1', { includeRevoked: true })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/client-grants?include_revoked=true',
        signal: undefined,
      },
      clientGrantListSchema
    )
  })

  it('invites a client grant', async () => {
    await resource.invite('org_1', 'prj_1', { userId: 'usr_client' })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/client-grants',
        body: { userId: 'usr_client' },
        signal: undefined,
      },
      clientGrantSchema
    )
  })

  it('updates and revokes grants', async () => {
    await resource.update('org_1', 'prj_1', 'cgt_1', { allowTime: false })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org_1/projects/prj_1/client-grants/cgt_1',
        body: { allowTime: false },
        signal: undefined,
      },
      clientGrantSchema
    )

    await resource.revoke('org_1', 'prj_1', 'cgt_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/client-grants/cgt_1/revoke',
        signal: undefined,
      },
      clientGrantSchema
    )
  })
})
