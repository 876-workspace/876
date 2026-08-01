import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876PlatformClient } from '../index'

const LOCATION = {
  object: 'org_location',
  id: 'loc_kingston',
  organization_id: 'org_rocketship',
  name: 'Kingston branch',
  code: 'br_kingston',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function setup(response = jsonResponse({ data: LOCATION, error: null })) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  const $876 = create876PlatformClient({
    fetch: fetchMock,
    baseUrl: 'https://api.876.test',
    internalKey: 'test-internal-key',
  })
  return { $876, fetchMock }
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
  return {
    url,
    init,
    // A GET carries no body, so parse lazily rather than in every caller.
    get body() {
      return JSON.parse(String(init.body))
    },
  }
}

describe('platform.locations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is exposed on the platform client', () => {
    const { $876 } = setup()

    expect($876.locations.create).toBeTypeOf('function')
    expect($876.locations.list).toBeTypeOf('function')
    expect($876.locations.retrieve).toBeTypeOf('function')
    expect($876.locations.update).toBeTypeOf('function')
  })

  it('posts a create to the organization locations collection', async () => {
    const { $876, fetchMock } = setup()

    const result = await $876.locations.create('org_rocketship', {
      name: 'Kingston branch',
    })

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(
      'https://api.876.test/organizations/org_rocketship/locations'
    )
    expect(init.method).toBe('POST')
    expect(result).toEqual({ data: LOCATION, error: null })
  })

  it('maps camelCase params onto the API snake_case body', async () => {
    const { $876, fetchMock } = setup()

    await $876.locations.create('org_rocketship', {
      name: 'Kingston branch',
      code: 'br_kingston',
      type: 'branch',
      status: 'active',
      regionId: 'reg_jm_sta',
      countryCode: 'JM',
      postalCode: 'JMAKN05',
      metadata: { source_app: '876-couriers' },
    })

    const { body } = requestOf(fetchMock)
    expect(body).toMatchObject({
      name: 'Kingston branch',
      code: 'br_kingston',
      type: 'branch',
      status: 'active',
      region_id: 'reg_jm_sta',
      country_code: 'JM',
      postal_code: 'JMAKN05',
      metadata: { source_app: '876-couriers' },
    })
    expect('regionId' in body).toBe(false)
    expect('countryCode' in body).toBe(false)
    expect('postalCode' in body).toBe(false)
  })

  it('never sends is_primary, which stays owned by the organization profile', async () => {
    const { $876, fetchMock } = setup()

    await $876.locations.create('org_rocketship', {
      name: 'Kingston branch',
      // @ts-expect-error is_primary is deliberately absent from the params type
      isPrimary: true,
    })

    const { body } = requestOf(fetchMock)
    expect('is_primary' in body).toBe(false)
    expect('isPrimary' in body).toBe(false)
  })

  it('patches an update at the location resource path', async () => {
    const { $876, fetchMock } = setup()

    await $876.locations.update('org_rocketship', 'loc_kingston', {
      name: 'Kingston HQ',
    })

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(
      'https://api.876.test/organizations/org_rocketship/locations/loc_kingston'
    )
    expect(init.method).toBe('PATCH')
  })

  it('percent-encodes ids so a stray path segment cannot escape the route', async () => {
    const { $876, fetchMock } = setup()

    await $876.locations.retrieve('org/rocketship', 'loc/kingston')

    const { url } = requestOf(fetchMock)
    expect(url).toBe(
      'https://api.876.test/organizations/org%2Frocketship/locations/loc%2Fkingston'
    )
  })

  it('surfaces the duplicate-code conflict the mirror keys its idempotency off', async () => {
    const { $876 } = setup(
      jsonResponse(
        {
          data: null,
          error: {
            code: 'location/duplicate-code',
            message: 'A location with this code already exists.',
          },
        },
        409
      )
    )

    const result = await $876.locations.create('org_rocketship', {
      name: 'Kingston branch',
      code: 'br_kingston',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('location/duplicate-code')
  })
})
