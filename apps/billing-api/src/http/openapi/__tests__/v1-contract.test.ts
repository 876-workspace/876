import { z } from 'zod'
import { createDocument } from 'zod-openapi'

import {
  v1ComponentSchemas,
  v1OperationContracts,
} from '@/http/openapi/v1-contract.generated'
import {
  applyV1ComponentCompatibility,
  renderV1OperationCompatibility,
  v1Operation,
  v1Schema,
} from '@/http/openapi/v1-contract'

describe('Billing v1 compatibility metadata', () => {
  it('keeps runtime Zod validation while rendering the frozen component', () => {
    const runtimeSchema = z.strictObject({
      currency: z.string().regex(/^[A-Za-z]{3}$/),
    })
    const compatibilitySchema = v1Schema(
      runtimeSchema,
      'TenantCurrencyEnableParams'
    )

    expect(compatibilitySchema.safeParse({ currency: 'JMD' }).success).toBe(
      true
    )
    expect(compatibilitySchema.safeParse({ currency: 'INVALID' }).success).toBe(
      false
    )

    const document = createDocument({
      openapi: '3.1.0',
      info: { title: 'Compatibility test', version: '1' },
      paths: {
        '/currencies': {
          post: {
            requestBody: {
              content: {
                'application/json': { schema: compatibilitySchema },
              },
            },
            responses: { 204: { description: 'Accepted' } },
          },
        },
      },
    })

    applyV1ComponentCompatibility(document)
    expect(document.components?.schemas?.TenantCurrencyEnableParams).toEqual(
      v1ComponentSchemas.TenantCurrencyEnableParams
    )
  })

  it('returns exact generated route metadata for a baseline operation', () => {
    expect(v1Operation('post', '/vendors')).toEqual({
      description: 'Ported from `src/app/api/billing/vendors/route.ts`.',
      operationId: 'billing-billing_post_vendors',
      summary: 'Billing POST /vendors',
      tags: ['Billing'],
    })
  })

  it('resolves an Express path parameter to the same frozen entry as its OpenAPI form', () => {
    expect(v1Operation('get', '/vendors/:vendorId')).toEqual(
      v1Operation('get', '/vendors/{vendorId}')
    )
  })

  it('returns metadata for an operation added after the baseline was cut', () => {
    // Accounting providers post-date the frozen Next.js baseline. They resolve
    // because the regenerated contract was committed, which is what keeps the
    // published documentation from drifting away from the routes.
    expect(v1Operation('get', '/admin/accounting-providers')).toEqual(
      expect.objectContaining({ tags: expect.any(Array) })
    )
  })

  it('returns undefined for an operation absent from the frozen contract', () => {
    // Not a throw: a brand-new route must be able to boot so the contract can
    // be regenerated from it. `api:contract:check` still fails the route as an
    // extra operation until that regenerated baseline is committed.
    expect(v1Operation('get', '/not-a-v1-route')).toBeUndefined()
  })

  it('renders frozen shapes only when route-owned security and statuses match', () => {
    const matching = renderV1OperationCompatibility({
      method: 'post',
      path: '/customers',
      operation: {
        security: [{ tenantOAuth: [] }],
        responses: {
          201: { description: 'runtime success schema' },
          '4XX': { description: 'runtime error schema' },
        },
      },
      hasRuntimeBody: true,
      documentBody: true,
    })
    expect(matching).toEqual(v1OperationContracts['POST /customers'])

    const wrongStatus = renderV1OperationCompatibility({
      method: 'post',
      path: '/customers',
      operation: {
        security: [{ tenantOAuth: [] }],
        responses: { 200: { description: 'wrong status' } },
      },
      hasRuntimeBody: true,
      documentBody: true,
    })
    expect(wrongStatus.responses).toEqual({
      200: { description: 'wrong status' },
    })

    const wrongSecurity = renderV1OperationCompatibility({
      method: 'post',
      path: '/customers',
      operation: {
        security: [{ internalKey: [] }],
        responses: {
          201: { description: 'runtime success schema' },
          '4XX': { description: 'runtime error schema' },
        },
      },
      hasRuntimeBody: true,
      documentBody: true,
    })
    expect(wrongSecurity.security).toEqual([{ internalKey: [] }])
  })
})
