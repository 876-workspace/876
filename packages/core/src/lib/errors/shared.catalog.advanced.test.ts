import { describe, expect, it } from 'vitest'

import { getError } from './helpers.js'
import { assertValidErrorRegistry } from './testing.js'
import { API_KEY_ERRORS } from './api-keys.js'
import { AUTH_ERRORS } from './auth.js'
import { GENERIC_ERRORS } from './generic.js'
import { INTEGRATION_KEY_ERRORS } from './integration-keys.js'
import { ORGANIZATION_ERRORS } from './organizations.js'
import { REQUEST_ERRORS } from './request.js'
import { TENANT_ERRORS } from './tenants.js'

describe('Shared catalogs - platform contract', () => {
  it('auth registry satisfies the shared contract', () => {
    assertValidErrorRegistry(AUTH_ERRORS, {
      namespace: 'auth',
      exactCount: 59,
    })
  })

  it('request registry satisfies the shared contract', () => {
    assertValidErrorRegistry(REQUEST_ERRORS, {
      namespace: 'request',
      exactCount: 2,
    })
  })

  it('generic registry satisfies the shared contract', () => {
    assertValidErrorRegistry(GENERIC_ERRORS, { exactCount: 7 })
  })

  it('api-key registry satisfies the shared contract', () => {
    assertValidErrorRegistry(API_KEY_ERRORS, {
      namespace: 'api-key',
      exactCount: 8,
    })
  })

  it('integration-key registry satisfies the shared contract', () => {
    assertValidErrorRegistry(INTEGRATION_KEY_ERRORS, {
      namespace: 'integration-key',
      exactCount: 2,
    })
  })

  it('organization registry satisfies the shared contract', () => {
    assertValidErrorRegistry(ORGANIZATION_ERRORS, {
      namespace: 'organization',
      exactCount: 7,
    })
  })

  it('tenant registry satisfies the shared contract', () => {
    assertValidErrorRegistry(TENANT_ERRORS, {
      namespace: 'tenant',
      exactCount: 2,
    })
  })

  it('resolves every required shared code without caller overrides', () => {
    for (const code of [
      'auth/no-session',
      'auth/forbidden',
      'auth/invalid-token',
      'auth/identity-unavailable',
      'auth/internal-error',
      'request/invalid',
      'request/invalid-json',
      'error/bad-request',
      'error/not-found',
      'error/conflict',
      'error/unknown',
      'api-key/missing',
      'api-key/invalid',
      'integration-key/missing',
      'integration-key/invalid',
    ] as const)
      expect(getError(code).code).toBe(code)
  })

  it('routes unknown namespaced codes to explicit fallbacks', () => {
    expect(getError('request/something-new').code).toBe('request/invalid')
    expect(getError('error/something-new').code).toBe('error/unknown')
    expect(getError('integration-key/something-new').code).toBe(
      'integration-key/invalid'
    )
    expect(getError('auth/something-new').code).toBe('auth/unknown-error')
  })
})
