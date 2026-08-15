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

  it('returns exact generated route metadata and rejects unknown operations', () => {
    expect(v1Operation('post', '/vendors')).toEqual({
      description: 'Ported from `src/app/api/billing/vendors/route.ts`.',
      operationId: 'billing-billing_post_vendors',
      summary: 'Billing POST /vendors',
      tags: ['Billing'],
    })
    expect(v1Operation('get', '/vendors/:vendorId')).toEqual(
      v1Operation('get', '/vendors/{vendorId}')
    )
    expect(() => v1Operation('get', '/not-a-v1-route')).toThrow(
      'Unknown Billing v1 operation: GET /not-a-v1-route'
    )
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
