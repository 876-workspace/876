/**
 * The WorkOS provider.
 *
 * The behaviour that matters most here is the split between the two request
 * paths: an auth 4xx must reach the caller **raw**, because it often carries the
 * token an auth flow needs, while every other failure must be normalized before
 * it escapes. A port that normalized both would break email verification in a
 * way no type check catches.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAppHttpError } from '@/platform/errors'

import {
  isWorkOsHttpError,
  normalizeWorkOsError,
  WorkOsClient,
  WorkOsHttpError,
} from '../index'

const API_KEY = 'sk_test_workos_0123456789'

function client(): WorkOsClient {
  return new WorkOsClient({
    apiKey: API_KEY,
    baseUrl: 'https://api.workos.test',
  })
}

/** Stub `fetch` with a queue of responses, and record every call. */
function stubFetch(responses: { status: number; body?: unknown }[]): {
  calls: { url: string; init: RequestInit }[]
} {
  const calls: { url: string; init: RequestInit }[] = []
  let index = 0

  vi.stubGlobal('fetch', (input: URL | string, init: RequestInit) => {
    calls.push({ url: String(input), init })
    const next = responses[Math.min(index, responses.length - 1)]
    index += 1

    const status = next?.status ?? 200
    // 204/205/304 must be constructed with a null body, or Response throws —
    // which the client would then report as a transport failure.
    const bodyAllowed = ![204, 205, 304].includes(status)

    return Promise.resolve(
      new Response(
        bodyAllowed && next?.body !== undefined
          ? JSON.stringify(next.body)
          : null,
        { status, headers: { 'Content-Type': 'application/json' } }
      )
    )
  })

  return { calls }
}

function bodyOf(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the auth request path', () => {
  it('throws the raw WorkOsHttpError so the adapter can read the body', async () => {
    // This is the reason postAuth exists: the token below must survive.
    stubFetch([
      {
        status: 403,
        body: {
          code: 'email_verification_required',
          pending_authentication_token: 'pat_abc123',
          email: 'alejandra@example.com',
        },
      },
    ])

    const error = await client()
      .authenticateWithPassword({
        email: 'alejandra@example.com',
        password: 'sm2uTmv6InrQH6Az',
        clientId: 'client_1',
      })
      .catch((caught: unknown) => caught)

    expect(isWorkOsHttpError(error)).toBe(true)
    expect((error as WorkOsHttpError).status).toBe(403)
    expect((error as WorkOsHttpError).body).toMatchObject({
      pending_authentication_token: 'pat_abc123',
    })
  })

  it('sends the password grant with the client secret', async () => {
    const { calls } = stubFetch([
      { status: 200, body: { user: { id: 'u_1' } } },
    ])

    await client().authenticateWithPassword({
      email: 'alejandra@example.com',
      password: 'sm2uTmv6InrQH6Az',
      clientId: 'client_1',
      ipAddress: '203.0.113.4',
      userAgent: 'Mozilla/5.0',
    })

    expect(calls[0]?.url).toBe(
      'https://api.workos.test/user_management/authenticate'
    )
    expect(bodyOf(calls[0]!.init)).toEqual({
      grant_type: 'password',
      email: 'alejandra@example.com',
      password: 'sm2uTmv6InrQH6Az',
      client_id: 'client_1',
      client_secret: API_KEY,
      ip_address: '203.0.113.4',
      user_agent: 'Mozilla/5.0',
    })
  })

  it('omits absent optional fields rather than sending null', async () => {
    // WorkOS rejects an explicit null where it expects the field to be absent.
    const { calls } = stubFetch([{ status: 200, body: {} }])

    await client().authenticateWithPassword({
      email: 'a@b.co',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(bodyOf(calls[0]!.init)).not.toHaveProperty('ip_address')
    expect(bodyOf(calls[0]!.init)).not.toHaveProperty('user_agent')
  })

  it.each([
    [
      'the email-verification grant',
      'urn:workos:oauth:grant-type:email-verification:code',
      () =>
        client().authenticateWithEmailVerification({
          code: '123456',
          pendingAuthenticationToken: 'pat_abc',
          clientId: 'client_1',
        }),
    ],
    [
      'the magic-auth grant',
      'urn:workos:oauth:grant-type:magic-auth:code',
      () =>
        client().authenticateWithMagicAuth({
          code: '123456',
          email: 'a@b.co',
          clientId: 'client_1',
        }),
    ],
    [
      'the refresh-token grant',
      'refresh_token',
      () =>
        client().authenticateWithRefreshToken({
          refreshToken: 'rt_1',
          clientId: 'client_1',
        }),
    ],
    [
      'the authorization-code grant',
      'authorization_code',
      () =>
        client().authenticateWithCode({ code: 'c_1', clientId: 'client_1' }),
    ],
  ])('sends %s', async (_label, grantType, call) => {
    const { calls } = stubFetch([{ status: 200, body: {} }])

    await call()

    expect(bodyOf(calls[0]!.init)['grant_type']).toBe(grantType)
  })
})

describe('the normalized request path', () => {
  it.each([
    ['email_address_conflict', 'auth/email-already-exists', 409],
    ['email_verification_required', 'auth/email-not-verified', 401],
    ['invalid_credentials', 'auth/invalid-credentials', 401],
    ['password_reset_required', 'auth/invalid-credentials', 401],
    ['account_selection_required', 'auth/oauth-failed', 400],
    ['organization_not_found', 'auth/oauth-failed', 404],
    ['membership_not_found', 'auth/oauth-failed', 404],
    ['user_not_found', 'auth/oauth-failed', 404],
    ['user_creation_error', 'auth/registration-failed', 400],
    ['external_id_already_used', 'organization/provider-conflict', 409],
  ])('maps %s to %s', (workosCode, expectedCode, expectedStatus) => {
    const normalized = normalizeWorkOsError(
      new WorkOsHttpError(400, { code: workosCode })
    )

    expect(normalized.code).toBe(expectedCode)
    expect(normalized.httpStatus).toBe(expectedStatus)
  })

  it('reads the code from the `error` field as well as `code`', () => {
    expect(
      normalizeWorkOsError(
        new WorkOsHttpError(400, { error: 'invalid_credentials' })
      ).code
    ).toBe('auth/invalid-credentials')
  })

  it('falls back to oauth-failed at the upstream status', () => {
    const normalized = normalizeWorkOsError(
      new WorkOsHttpError(418, { code: 'something_new' })
    )

    expect(normalized.code).toBe('auth/oauth-failed')
    expect(normalized.httpStatus).toBe(418)
  })

  it('falls back to 502 when the status is unusable', () => {
    // An unrecognised provider failure is a bad gateway: the fault is upstream.
    expect(normalizeWorkOsError(new WorkOsHttpError(0, {})).httpStatus).toBe(
      502
    )
  })

  it('never leaks the upstream message to the client', () => {
    const normalized = normalizeWorkOsError(
      new WorkOsHttpError(400, {
        code: 'invalid_credentials',
        message: 'user sk_live_abcdef not found in environment env_9',
      })
    )

    expect(normalized.message).toBe(
      'The sign-in information you entered is incorrect.'
    )
    expect(normalized.message).not.toContain('sk_live')
  })

  it('gives the same message for invalid credentials and a required reset', () => {
    // Neither may confirm that an account exists.
    const invalid = normalizeWorkOsError(
      new WorkOsHttpError(401, { code: 'invalid_credentials' })
    )
    const reset = normalizeWorkOsError(
      new WorkOsHttpError(401, { code: 'password_reset_required' })
    )

    expect(invalid.message).toBe(reset.message)
    expect(invalid.code).toBe(reset.code)
  })

  it('normalizes a create-user failure before it escapes', async () => {
    stubFetch([{ status: 409, body: { code: 'email_address_conflict' } }])

    const error = await client()
      .createUser({ email: 'taken@example.com' })
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect(isWorkOsHttpError(error)).toBe(false)
  })

  it('turns a transport failure into a 502 rather than a normalized code', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('network down')))

    const error = await client()
      .createUser({ email: 'a@b.co' })
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect((error as { code: string }).code).toBe('auth/provider-unavailable')
    expect((error as { httpStatus: number }).httpStatus).toBe(502)
  })
})

describe('users', () => {
  it('sends the documented create-user body', async () => {
    const { calls } = stubFetch([{ status: 201, body: { id: 'user_1' } }])

    await client().createUser({
      email: 'alejandra@example.com',
      firstName: 'Alejandra',
      lastName: 'Reyes',
      emailVerified: true,
    })

    expect(bodyOf(calls[0]!.init)).toEqual({
      email: 'alejandra@example.com',
      first_name: 'Alejandra',
      last_name: 'Reyes',
      email_verified: true,
    })
  })

  it('defaults email_verified to false', async () => {
    const { calls } = stubFetch([{ status: 201, body: {} }])

    await client().createUser({ email: 'a@b.co' })

    expect(bodyOf(calls[0]!.init)['email_verified']).toBe(false)
  })

  it('returns the data array from a filtered list', async () => {
    stubFetch([{ status: 200, body: { data: [{ id: 'user_1' }] } }])

    await expect(client().listUsers('a@b.co')).resolves.toEqual([
      { id: 'user_1' },
    ])
  })

  it('returns an empty array when the list body has no data', async () => {
    stubFetch([{ status: 200, body: {} }])

    await expect(client().listUsers('a@b.co')).resolves.toEqual([])
  })

  it('puts the email filter in the query string', async () => {
    const { calls } = stubFetch([{ status: 200, body: { data: [] } }])

    await client().listUsers('a@b.co')

    expect(calls[0]?.url).toBe(
      'https://api.workos.test/user_management/users?email=a%40b.co'
    )
  })
})

describe('cursor pagination', () => {
  it('follows the after cursor until it runs out', async () => {
    const { calls } = stubFetch([
      {
        status: 200,
        body: { data: [{ id: 'u_1' }], list_metadata: { after: 'cur_2' } },
      },
      {
        status: 200,
        body: { data: [{ id: 'u_2' }], list_metadata: { after: null } },
      },
    ])

    await expect(client().listAllUsers()).resolves.toEqual([
      { id: 'u_1' },
      { id: 'u_2' },
    ])
    expect(calls).toHaveLength(2)
    expect(calls[0]?.url).toContain('limit=100')
    expect(calls[1]?.url).toContain('after=cur_2')
  })

  it('stops on a page with no list_metadata at all', async () => {
    const { calls } = stubFetch([
      { status: 200, body: { data: [{ id: 'u_1' }] } },
    ])

    await expect(client().listAllUsers()).resolves.toHaveLength(1)
    expect(calls).toHaveLength(1)
  })

  it('threads membership filters through every page', async () => {
    const { calls } = stubFetch([{ status: 200, body: { data: [] } }])

    await client().listAllOrganizationMemberships({ organizationId: 'org_1' })

    expect(calls[0]?.url).toContain('organization_id=org_1')
    expect(calls[0]?.url).not.toContain('user_id=')
  })
})

describe('getAuthorizationUrl', () => {
  it('builds the base URL with the required parameters', () => {
    expect(
      client().getAuthorizationUrl({
        clientId: 'client_1',
        redirectUri: 'https://876.app/callback',
      })
    ).toBe(
      'https://api.workos.test/sso/authorize?client_id=client_1&redirect_uri=https%3A%2F%2F876.app%2Fcallback&response_type=code'
    )
  })

  it('appends only the optional parameters that were given', () => {
    const url = client().getAuthorizationUrl({
      clientId: 'client_1',
      redirectUri: 'https://876.app/callback',
      provider: 'GoogleOAuth',
      state: 'st_1',
    })

    expect(url).toContain('provider=GoogleOAuth')
    expect(url).toContain('state=st_1')
    expect(url).not.toContain('screen_hint')
    expect(url).not.toContain('login_hint')
  })
})

describe('deletes and revocations', () => {
  it('tolerates an empty body on delete', async () => {
    stubFetch([{ status: 204 }])

    await expect(client().deleteUser('user_1')).resolves.toBeUndefined()
  })

  it('normalizes a failed session revocation', async () => {
    stubFetch([{ status: 404, body: { code: 'user_not_found' } }])

    const error = await client()
      .revokeSession('ses_1')
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect((error as { code: string }).code).toBe('auth/oauth-failed')
  })

  it('sends a DELETE to the membership path', async () => {
    const { calls } = stubFetch([{ status: 204 }])

    await client().deleteOrganizationMembership('om_1')

    expect(calls[0]?.init.method).toBe('DELETE')
    expect(calls[0]?.url).toBe(
      'https://api.workos.test/user_management/organization_memberships/om_1'
    )
  })
})

describe('authorization header', () => {
  it('sends the API key as a bearer token on every request', async () => {
    const { calls } = stubFetch([{ status: 200, body: {} }])

    await client().getFeatureFlag('some_flag')

    expect(
      (calls[0]?.init.headers as Record<string, string>)['Authorization']
    ).toBe(`Bearer ${API_KEY}`)
  })
})
