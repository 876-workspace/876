import { describe, expect, it } from 'vitest'

import { OpenApiDocument } from './openapi'

describe('OpenApiDocument', () => {
  it('publishes versioned tenant and secret-service operations', () => {
    expect(OpenApiDocument.openapi).toBe('3.1.0')
    expect(OpenApiDocument.servers).toEqual([{ url: '/api/v1' }])
    expect(OpenApiDocument.paths).toHaveProperty('/invoices.post')
    expect(OpenApiDocument.paths).toHaveProperty('/banking/accounts.post')
    expect(OpenApiDocument.paths).toHaveProperty(
      '/banking/accounts/{accountId}/transactions/{transactionId}.delete'
    )
    expect(OpenApiDocument.paths).toHaveProperty('/payments.post')
    expect(OpenApiDocument.paths).toHaveProperty(
      '/payments/modes/{modeId}.patch'
    )
    expect(OpenApiDocument.paths).toHaveProperty('/tax-rates.post')
    expect(OpenApiDocument.paths).toHaveProperty(
      '/tax-authorities/{taxAuthorityId}.patch'
    )
    expect(OpenApiDocument.paths).toHaveProperty('/roles.post')
    expect(OpenApiDocument.paths).toHaveProperty('/members/{userId}.patch')
    expect(OpenApiDocument.paths).toHaveProperty('/products.post')
    expect(OpenApiDocument.paths).toHaveProperty('/plans/{planId}/clone.post')
    expect(OpenApiDocument.paths).toHaveProperty(
      '/addons/{addonId}/associations.put'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/price-lists/{priceListId}/resolve.post'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/discounts/coupons/{couponId}.patch'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/admin/subscriptions/ensure.post'
    )
    expect(
      OpenApiDocument.paths['/admin/subscriptions/ensure'].post.security
    ).toEqual([{ internalKey: [] }])
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/customers/{customerId}.patch'
    )
    expect(
      OpenApiDocument.paths[
        '/integrations/organizations/{organizationId}/customers'
      ].get.security
    ).toEqual([
      { internalKey: [] },
      { appApiKey: [] },
      { delegatedOAuth: ['billing.customers.read'] },
    ])
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/items.post'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/invoices/{invoiceId}/finalize.post'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/payments.post'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/payment-modes.get'
    )
    expect(OpenApiDocument.paths).toHaveProperty(
      '/integrations/organizations/{organizationId}/bank-accounts.get'
    )
    expect(
      OpenApiDocument.paths[
        '/integrations/organizations/{organizationId}/payments'
      ].post.parameters
    ).toContainEqual(
      expect.objectContaining({ name: 'Idempotency-Key', in: 'header' })
    )
  })

  it('documents resource, list, and deletion envelopes distinctly', () => {
    const accountPath = OpenApiDocument.paths['/banking/accounts/{accountId}']
    const listSchema =
      OpenApiDocument.paths['/banking/accounts'].get.responses['200'].content[
        'application/json'
      ].schema
    const retrieveSchema =
      accountPath.get.responses['200'].content['application/json'].schema
    const deleteSchema =
      accountPath.delete.responses['200'].content['application/json'].schema

    expect(listSchema.properties.data.properties.data.items).toMatchObject({
      properties: { object: { const: 'bank_account' } },
      additionalProperties: true,
    })
    expect(retrieveSchema.properties.data).toMatchObject({
      properties: { object: { const: 'bank_account' } },
      additionalProperties: true,
    })
    expect(deleteSchema.properties.data).toMatchObject({
      required: ['object', 'id', 'deleted'],
      properties: { deleted: { const: true } },
      additionalProperties: false,
    })
  })
})
