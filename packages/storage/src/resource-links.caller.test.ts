import { describe, expect, it, vi } from 'vitest'

import { create876StorageClient } from './client'
import type {
  ResourceLink,
  ResourceLinkCreateParams,
} from './types/resource-links'

/**
 * A link is created against a file, so the service resolves that file and
 * applies its disclosure rule before accepting the link. An `organization`
 * file is refused outright when the calling app does not name the principal it
 * acts for — which is what these tests pin.
 */
const CALLER = {
  sourceAppId: '876-projects',
  actorUserId: 'usr_1',
  actorOrgId: 'org_1',
} as const

const CALLER_HEADERS = {
  'x-876-source-app-id': CALLER.sourceAppId,
  'x-876-actor-user-id': CALLER.actorUserId,
  'x-876-actor-org-id': CALLER.actorOrgId,
} as const

const params: ResourceLinkCreateParams = {
  file_id: 'file_01J8XYZ',
  app_id: '876-projects',
  resource_type: 'issue',
  resource_id: 'iss_1',
  relation: 'attachment',
  owner_type: 'organization',
  owner_id: 'org_1',
  actor_user_id: 'usr_1',
}

const link: ResourceLink = {
  object: 'resource_link',
  id: 'rlink_01J8XYZ',
  file_id: 'file_01J8XYZ',
  app_id: '876-projects',
  resource_type: 'issue',
  resource_id: 'iss_1',
  relation: 'attachment',
  created_by: 'usr_1',
  created_at: 1_753_487_000,
}

function client(fetchMock: typeof fetch) {
  return create876StorageClient({
    baseUrl: 'https://storage.example.test',
    internalKey: 'storage-service-secret',
    fetch: fetchMock,
  })
}

describe('resourceLinks caller assertion', () => {
  it('sends the caller assertion when creating a link', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(link, { status: 201 }))

    const result = await client(fetchMock).resourceLinks.create(params, CALLER)

    expect(result).toEqual({ data: link, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/resource-links',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
          ...CALLER_HEADERS,
        },
        body: JSON.stringify(params),
      }
    )
  })

  it('sends the caller assertion when listing a record’s links', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ object: 'list', data: [link] }))

    const result = await client(fetchMock).resourceLinks.list(
      {
        app_id: '876-projects',
        resource_type: 'issue',
        resource_id: 'iss_1',
        relation: 'attachment',
      },
      CALLER
    )

    expect(result).toEqual({
      data: { object: 'list', data: [link] },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/resource-links?app_id=876-projects&resource_type=issue&resource_id=iss_1&relation=attachment',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
          ...CALLER_HEADERS,
        },
      }
    )
  })

  it('sends the caller assertion when removing a link', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        object: 'resource_link',
        id: 'rlink_01J8XYZ',
        deleted: true,
      })
    )

    const result = await client(fetchMock).resourceLinks.delete(
      'rlink/with space',
      CALLER
    )

    expect(result).toEqual({
      data: { object: 'resource_link', id: 'rlink_01J8XYZ', deleted: true },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/resource-links/rlink%2Fwith%20space',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
          ...CALLER_HEADERS,
        },
      }
    )
  })

  it('names only the app when that is all the caller asserts', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(link, { status: 201 }))

    await client(fetchMock).resourceLinks.create(params, {
      sourceAppId: '876-projects',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/resource-links',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
          'x-876-source-app-id': '876-projects',
        },
      })
    )
  })
})
