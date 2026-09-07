import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { registeredOperations } from '@/http/openapi/registry'

function fixturePath(path: string): string {
  return `/api/v1${path.replaceAll(/\{([^}]+)\}/g, (_match, name: string) => `/fixture_${name}`)}`.replaceAll(
    '//',
    '/'
  )
}

function protectedPublicOperations() {
  return registeredOperations('public').filter(
    ({ operation }) => (operation.security?.length ?? 0) > 0
  )
}

describe('frozen v1 route authentication matrix', () => {
  beforeAll(() => {
    process.env.BILLING_WRITER = 'express'
    process.env.BILLING_INTERNAL_KEY = 'internal-secret'
    process.env.BILLING_SCHEDULER_KEY = 'scheduler-secret'
    resetSettingsForTest(process.env)
  })

  it('keeps intentionally public operations out of the protected matrix', () => {
    const app = createApp()
    void app
    const operations = registeredOperations('public')
    const callback = operations.find(
      ({ method, path }) =>
        method === 'get' && path === '/providers/zoho-books/oauth/callback'
    )

    expect(operations).toHaveLength(221)
    expect(protectedPublicOperations()).toHaveLength(220)
    expect(callback).toBeDefined()
    expect(callback?.operation.security ?? []).toEqual([])
  })

  it('enforces credential extraction through the assembled middleware on every protected operation', async () => {
    const app = createApp()

    for (const operation of protectedPublicOperations()) {
      const call = request(app)
        [operation.method](fixturePath(operation.path))
        .set('x-billing-organization-id', 'fixture_organizationId')
      if (operation.method !== 'get' && operation.method !== 'delete') {
        call.type('json').send({})
      }
      const response = await call
      expect(response.status, `${operation.method} ${operation.path}`).toBe(401)
      expect(
        response.body.error?.code,
        `${operation.method} ${operation.path}`
      ).toBe('auth/missing-credential')
    }
  })

  it('rejects ambiguous credential kinds before route validation on every protected operation', async () => {
    const app = createApp()
    for (const operation of protectedPublicOperations()) {
      const call = request(app)
        [operation.method](fixturePath(operation.path))
        .set('x-billing-organization-id', 'fixture_organizationId')
        .set('authorization', 'Bearer fixture-token')
        .set('x-876-api-key', '876_app_secret_fixture')
      if (operation.method !== 'get' && operation.method !== 'delete') {
        call.type('json').send({})
      }
      const response = await call
      expect(response.status, `${operation.method} ${operation.path}`).toBe(400)
      expect(
        response.body.error?.code,
        `${operation.method} ${operation.path}`
      ).toBe('auth/ambiguous-credential')
    }
  })
})
