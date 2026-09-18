import { createApp } from '@/application'
import { buildOpenApiDocument } from '@/http/openapi/registry'
import {
  compareOpenApiContracts,
  formatOpenApiContractComparison,
  INTENTIONAL_ADDITIONS,
  loadFrozenBillingContract,
  openApiContractsMatch,
} from '@/test/openapi-contract'

describe('Billing v1 OpenAPI contract', () => {
  it('matches the frozen FastAPI contract apart from declared additions', async () => {
    createApp()
    const expected = await loadFrozenBillingContract()
    const actual = buildOpenApiDocument({
      registry: 'public',
      identityApiUrl: 'http://127.0.0.1:4000',
    })
    const comparison = compareOpenApiContracts(expected, actual, {
      intentionalAdditions: INTENTIONAL_ADDITIONS,
    })

    if (!openApiContractsMatch(comparison))
      throw new Error(formatOpenApiContractComparison(comparison))
  })

  it('still reports an undeclared extra operation', async () => {
    createApp()
    const expected = await loadFrozenBillingContract()
    const actual = buildOpenApiDocument({
      registry: 'public',
      identityApiUrl: 'http://127.0.0.1:4000',
    })

    // Declaring only one of the additions must leave the other seven reported,
    // proving the allowlist narrows the check rather than disabling it.
    const comparison = compareOpenApiContracts(expected, actual, {
      intentionalAdditions: ['GET /invoices/{invoiceId}/email'],
    })

    expect(openApiContractsMatch(comparison)).toBe(false)
    expect(comparison.extraOperations).toHaveLength(
      INTENTIONAL_ADDITIONS.length - 1
    )
    expect(comparison.extraOperations).not.toContain(
      'GET /invoices/{invoiceId}/email'
    )
  })

  it('reports a declared addition the service no longer serves', async () => {
    createApp()
    const expected = await loadFrozenBillingContract()
    const actual = buildOpenApiDocument({
      registry: 'public',
      identityApiUrl: 'http://127.0.0.1:4000',
    })

    const comparison = compareOpenApiContracts(expected, actual, {
      intentionalAdditions: [
        ...INTENTIONAL_ADDITIONS,
        'GET /invoices/{invoiceId}/not-a-real-operation',
      ],
    })

    expect(openApiContractsMatch(comparison)).toBe(false)
    expect(comparison.unusedIntentionalAdditions).toEqual([
      'GET /invoices/{invoiceId}/not-a-real-operation',
    ])
  })

  it('still fails when a frozen operation is missing', async () => {
    createApp()
    const expected = (await loadFrozenBillingContract()) as {
      paths: Record<string, unknown>
    }
    const actual = buildOpenApiDocument({
      registry: 'public',
      identityApiUrl: 'http://127.0.0.1:4000',
    })

    // Removals must never be excusable by the additions allowlist.
    const withExtraFrozenPath = {
      ...expected,
      paths: {
        ...expected.paths,
        '/a-frozen-operation-express-does-not-serve': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    }

    const comparison = compareOpenApiContracts(withExtraFrozenPath, actual, {
      intentionalAdditions: INTENTIONAL_ADDITIONS,
    })

    expect(openApiContractsMatch(comparison)).toBe(false)
    expect(comparison.missingOperations).toContain(
      'GET /a-frozen-operation-express-does-not-serve'
    )
  })
})
