import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  financialSummarySchema,
  invoiceDraftSchema,
  projectBillingSchema,
} from '../types'
import { createProjectBillingResource } from './project-billing'

describe('project billing resource', () => {
  const resource = createProjectBillingResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('retrieves the billing config', async () => {
    await resource.retrieve('org 1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/billing',
        signal: undefined,
      },
      projectBillingSchema
    )
  })

  it('puts the billing config', async () => {
    await resource.put('org 1', 'prj_1', {
      billingMethod: 'fixed-fee',
      currency: 'USD',
      fixedFeeAmount: 50000,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PUT',
        path: '/v1/organizations/org%201/projects/prj_1/billing',
        body: {
          billingMethod: 'fixed-fee',
          currency: 'USD',
          fixedFeeAmount: 50000,
        },
        signal: undefined,
      },
      projectBillingSchema
    )
  })

  it('fetches the financial summary with the period query', async () => {
    await resource.financialSummary('org 1', 'prj_1', { from: 10, to: 20 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: expect.stringContaining('/financial-summary?'),
        signal: undefined,
      },
      financialSummarySchema
    )
    const path = requestMock.mock.calls[0]?.[1]?.path as string
    expect(path).toContain('from=10')
    expect(path).toContain('to=20')
  })

  it('creates an invoice draft', async () => {
    await resource.createInvoiceDraft('org 1', 'prj_1', { from: 10, to: 20 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/projects/prj_1/invoice-drafts',
        body: { from: 10, to: 20 },
        signal: undefined,
      },
      invoiceDraftSchema
    )
  })

  it('encodes organization and project ids', async () => {
    await resource.retrieve('org/a', 'prj/b')
    const path = requestMock.mock.calls[0]?.[1]?.path as string
    expect(path).toContain('org%2Fa')
    expect(path).toContain('prj%2Fb')
  })
})
