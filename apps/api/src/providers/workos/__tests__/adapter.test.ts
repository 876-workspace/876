/**
 * The WorkOS auth adapter.
 *
 * Everything here is about the three-way outcome — session, event, or thrown
 * error. Collapsing the middle case into the third is the defect this suite
 * exists to prevent: a user who needs to verify their email would be told their
 * password was wrong, and the token that would let them continue would be gone.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAppHttpError } from '@/platform/errors'
import { isAuthEvent, isAuthSession } from '@/providers/auth'

import { WorkOsAuthProvider, toProviderUser } from '../adapter'
import { WorkOsClient } from '../client'

const API_KEY = 'sk_test_workos_0123456789'

function provider(): WorkOsAuthProvider {
  return new WorkOsAuthProvider(
    new WorkOsClient({ apiKey: API_KEY, baseUrl: 'https://api.workos.test' })
  )
}

function stubFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  )
}

const SUCCESS_BODY = {
  access_token: 'at_abc',
  refresh_token: 'rt_abc',
  organization_id: 'org_1',
  user: {
    id: 'user_2kL9',
    email: 'alejandra@example.com',
    first_name: 'Alejandra',
    last_name: 'Reyes',
    email_verified: true,
    profile_picture_url: 'https://cdn.876.app/a.png',
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a successful authentication', () => {
  it('returns a parsed session', async () => {
    stubFetch(200, SUCCESS_BODY)

    const result = await provider().login({
      email: 'alejandra@example.com',
      password: 'sm2uTmv6InrQH6Az',
      clientId: 'client_1',
    })

    expect(isAuthSession(result)).toBe(true)
    expect(result).toEqual({
      accessToken: 'at_abc',
      refreshToken: 'rt_abc',
      organizationId: 'org_1',
      user: {
        id: 'user_2kL9',
        email: 'alejandra@example.com',
        firstName: 'Alejandra',
        lastName: 'Reyes',
        emailVerified: true,
        avatar: 'https://cdn.876.app/a.png',
        metadata: {},
      },
    })
  })

  it('nulls a missing refresh token and organization', async () => {
    stubFetch(200, {
      access_token: 'at_abc',
      user: { id: 'u', email: 'a@b.co' },
    })

    const result = await provider().login({
      email: 'a@b.co',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(result).toMatchObject({ refreshToken: null, organizationId: null })
  })
})

describe('an auth-flow step', () => {
  it.each([
    'email_verification_required',
    'mfa_enrollment',
    'mfa_challenge',
    'organization_selection_required',
    'sso_required',
    'organization_authentication_methods_required',
    'authentication_method_not_allowed',
    'email_password_auth_disabled',
    'passkey_progressive_enrollment',
    'radar_challenge',
    'radar_sign_up_challenge',
  ])('returns an event for %s rather than throwing', async (code) => {
    stubFetch(403, { code })

    const result = await provider().login({
      email: 'a@b.co',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(isAuthEvent(result)).toBe(true)
    expect(result).toMatchObject({ kind: code })
  })

  it('carries the pending token through, which is the whole point', async () => {
    // Normalizing this 4xx would discard the token, and email verification
    // could never complete.
    stubFetch(403, {
      code: 'email_verification_required',
      email: 'alejandra@example.com',
      pending_authentication_token: 'pat_abc123',
    })

    const result = await provider().login({
      email: 'alejandra@example.com',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(result).toEqual({
      kind: 'email_verification_required',
      email: 'alejandra@example.com',
      pendingToken: 'pat_abc123',
      organizations: [],
      authFactors: [],
      connectionIds: [],
    })
  })

  it('carries the organization list for a selection step', async () => {
    stubFetch(403, {
      code: 'organization_selection_required',
      organizations: [{ id: 'org_1', name: 'Acme' }],
    })

    const result = await provider().login({
      email: 'a@b.co',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(result).toMatchObject({
      organizations: [{ id: 'org_1', name: 'Acme' }],
    })
  })

  it('keeps only string connection ids', async () => {
    stubFetch(403, {
      code: 'sso_required',
      connection_ids: ['conn_1', 42, null, 'conn_2'],
    })

    const result = await provider().login({
      email: 'a@b.co',
      password: 'pw',
      clientId: 'client_1',
    })

    expect(result).toMatchObject({ connectionIds: ['conn_1', 'conn_2'] })
  })

  it.each([
    'verifyOtp',
    'verifyEmail',
    'authenticateWithCode',
    'refresh',
  ] as const)('applies the same rule on %s', async (method) => {
    stubFetch(403, { code: 'mfa_challenge' })
    const p = provider()

    const result =
      method === 'verifyOtp'
        ? await p.verifyOtp({ code: '1', email: 'a@b.co', clientId: 'c' })
        : method === 'verifyEmail'
          ? await p.verifyEmail({
              code: '1',
              pendingAuthenticationToken: 'pat',
              clientId: 'c',
            })
          : method === 'authenticateWithCode'
            ? await p.authenticateWithCode({ code: '1', clientId: 'c' })
            : await p.refresh({ refreshToken: 'rt', clientId: 'c' })

    expect(isAuthEvent(result)).toBe(true)
  })
})

describe('a hard error', () => {
  it('throws a normalized error for invalid credentials', async () => {
    stubFetch(401, { code: 'invalid_credentials' })

    const error = await provider()
      .login({ email: 'a@b.co', password: 'wrong', clientId: 'client_1' })
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect((error as { code: string }).code).toBe('auth/invalid-credentials')
  })

  it('throws for a code outside the flow set', async () => {
    // A new WorkOS code is a hard error until it is deliberately added to
    // AUTH_FLOW_CODES — failing closed rather than inventing a flow step.
    stubFetch(400, { code: 'some_brand_new_code' })

    const error = await provider()
      .login({ email: 'a@b.co', password: 'pw', clientId: 'client_1' })
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect((error as { code: string }).code).toBe('auth/oauth-failed')
  })

  it('normalizes a registration conflict', async () => {
    stubFetch(409, { code: 'email_address_conflict' })

    const error = await provider()
      .register({ email: 'taken@example.com' })
      .catch((caught: unknown) => caught)

    expect((error as { code: string }).code).toBe('auth/email-already-exists')
    expect((error as { httpStatus: number }).httpStatus).toBe(409)
  })
})

describe('user lookup', () => {
  it('returns the first match', async () => {
    stubFetch(200, { data: [{ id: 'user_1', email: 'a@b.co' }] })

    await expect(provider().getUserByEmail('a@b.co')).resolves.toMatchObject({
      id: 'user_1',
    })
  })

  it('returns null when there is no match', async () => {
    stubFetch(200, { data: [] })

    await expect(provider().getUserByEmail('a@b.co')).resolves.toBeNull()
  })
})

describe('toProviderUser', () => {
  it('accepts snake_case', () => {
    expect(
      toProviderUser({
        id: 'u',
        email: 'a@b.co',
        first_name: 'Ada',
        last_name: 'L',
        email_verified: true,
        profile_picture_url: 'p',
      })
    ).toEqual({
      id: 'u',
      email: 'a@b.co',
      firstName: 'Ada',
      lastName: 'L',
      emailVerified: true,
      avatar: 'p',
      metadata: {},
    })
  })

  it('accepts camelCase, which some WorkOS endpoints return', () => {
    expect(
      toProviderUser({
        id: 'u',
        email: 'a@b.co',
        firstName: 'Ada',
        lastName: 'L',
        emailVerified: true,
        profilePictureUrl: 'p',
      })
    ).toMatchObject({
      firstName: 'Ada',
      lastName: 'L',
      emailVerified: true,
      avatar: 'p',
    })
  })

  it('defaults every optional field rather than leaving it undefined', () => {
    expect(toProviderUser({})).toEqual({
      id: '',
      email: '',
      firstName: null,
      lastName: null,
      emailVerified: false,
      avatar: null,
      metadata: {},
    })
  })

  it('ignores a metadata value that is not an object', () => {
    expect(toProviderUser({ metadata: 'nope' }).metadata).toEqual({})
    expect(toProviderUser({ metadata: ['a'] }).metadata).toEqual({})
  })
})

describe('sendVerificationEmail', () => {
  it('resolves on success', async () => {
    stubFetch(200, { id: 'user_1' })

    await expect(provider().sendVerificationEmail('user_1')).resolves.toEqual({
      id: 'user_1',
    })
  })

  it('throws a normalized error on failure', async () => {
    // The Python wrapped this call in `except httpx.HTTPStatusError`, but its
    // client had already converted the failure to an AppHTTPException — so that
    // clause was unreachable and the normalized error propagated. This asserts
    // what the Python did, not what its dead branch suggested.
    stubFetch(404, { code: 'user_not_found' })

    const error = await provider()
      .sendVerificationEmail('user_missing')
      .catch((caught: unknown) => caught)

    expect(isAppHttpError(error)).toBe(true)
    expect((error as { code: string }).code).toBe('auth/oauth-failed')
  })
})
