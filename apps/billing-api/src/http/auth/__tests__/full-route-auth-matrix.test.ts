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

    // 221 -> 220: the five `/estimates` operations were removed when the
    // duplicate Estimate document type was merged into Quote, and four quote
    // transitions (send/accept/decline/cancel) were added in their place. 220
    // -> 222: `POST /items/{itemId}/stock-adjustments` and `POST
    // /integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments`
    // were added as authenticated operations. 222 -> 254: item preferences,
    // variant search and item-variant operations, item media, and variant media
    // operations were added for both tenant and integration routes. 254 ->
    // 264: payment-mode CRUD and tax authority/rate configuration were added
    // to the organization-scoped integration surface. 264 -> 268: invoice
    // send and write-off commands were added to both tenant and integration
    // surfaces. 268 -> 280: quote lifecycle expiry, accepted-quote conversion,
    // and quote preference read/update were added to both tenant and
    // integration surfaces, plus the four integration quote decision commands.
    // 280 -> 285: integration payment update/delete/apply and refund list/create
    // were added as authenticated operations. 285 -> 297: Sales Receipt list,
    // create, retrieve, refund, void, and quote conversion were added to both
    // tenant and integration surfaces. 297 -> 315: Recurring Invoice profile
    // operations were added across the tenant and integration surfaces.
    // 315 -> 333: reporting projections (sales/cash/aging/item/customer/
    // subscription summaries, item detail, and report preferences) were added
    // to both tenant and integration surfaces. 333 -> 337: invoice clone and
    // invoice make-recurring were added to both the tenant and integration
    // surfaces, so an invoice can be duplicated or turned into a recurring
    // profile without rebuilding its lines client-side. 337 -> 369:
    // statement-first banking operations (rules, reconciliations, statement
    // imports/lines, transfers, directory banks/branches) and the bank
    // deposit lifecycle (list/create/retrieve/void) were added as
    // authenticated tenant operations. 369 -> 370: `GET
    // /banking/directory/branches` was added so the banking list can resolve
    // shared-directory branches across banks in one call.
    expect(operations).toHaveLength(370)
    expect(protectedPublicOperations()).toHaveLength(369)
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
