import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  createBankDeposit: vi.fn(),
  retrieveBankDeposit: vi.fn(),
  voidBankDeposit: vi.fn(),
  listBankDeposits: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    introspect = mocks.introspect
    appForApiKey = vi.fn()
    organizationMembership = mocks.organizationMembership
  },
}))
vi.mock('../banking-engine.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../banking-engine.service')>()),
  createBankDeposit: mocks.createBankDeposit,
  retrieveBankDeposit: mocks.retrieveBankDeposit,
  voidBankDeposit: mocks.voidBankDeposit,
  listBankDeposits: mocks.listBankDeposits,
}))

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { AppHttpError } from '@/http/errors'

const deposit = {
  object: 'bank-deposit' as const,
  id: 'deposit_1',
  sourceAccountId: 'acct_source',
  destinationAccountId: 'acct_destination',
  amount: '100',
  currency: 'USD',
  depositedAt: 1_700_000_000,
  description: null,
  reference: null,
  status: 'posted' as const,
  reversedAt: null,
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_000,
  transactionIds: ['txn_1'],
}
const body = {
  sourceAccountId: 'acct_source',
  destinationAccountId: 'acct_destination',
  transactionIds: ['txn_1'],
  amount: '100',
  currency: 'USD',
  depositedAt: 1_700_000_000,
}

function authorized(call: request.Test) {
  return call
    .set('authorization', 'Bearer token')
    .set('x-billing-organization-id', 'org_1')
}

describe('bank deposit routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({ id: 'ten_1', active: true })
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['banking:read', 'banking:write']),
    })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_1',
      appId: 'app_1',
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'owner' })
    mocks.createBankDeposit.mockResolvedValue(deposit)
    mocks.retrieveBankDeposit.mockResolvedValue(deposit)
    mocks.voidBankDeposit.mockResolvedValue({ ...deposit, status: 'reversed' })
  })

  it('creates a deposit with the 201 resource envelope', async () => {
    const response = await authorized(request(createApp()).post('/api/v1/banking/deposits'))
      .send(body)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: deposit, error: null })
    expect(mocks.createBankDeposit).toHaveBeenCalledWith('ten_1', {
      ...body,
      amount: 100n,
    })
  })

  it('returns validation errors before calling the deposit service', async () => {
    const response = await authorized(request(createApp()).post('/api/v1/banking/deposits'))
      .send({ ...body, amount: 'zero' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.createBankDeposit).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated deposit create', async () => {
    const response = await request(createApp())
      .post('/api/v1/banking/deposits')
      .set('x-billing-organization-id', 'org_1')
      .send(body)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/missing-credential')
    expect(mocks.createBankDeposit).not.toHaveBeenCalled()
  })

  it('returns 404 when a deposit belongs to another tenant', async () => {
    mocks.retrieveBankDeposit.mockRejectedValue(new AppHttpError({
      code: 'banking/bank-deposit-not-found',
      message: 'bank deposit not found.',
      httpStatus: 404,
    }))
    const response = await authorized(
      request(createApp()).get('/api/v1/banking/deposits/deposit_other_tenant')
    )

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'banking/bank-deposit-not-found',
      message: 'bank deposit not found.',
    })
  })

  it('voids a deposit with the 200 resource envelope', async () => {
    const response = await authorized(
      request(createApp()).post('/api/v1/banking/deposits/deposit_1/void')
    ).send({})

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { ...deposit, status: 'reversed' },
      error: null,
    })
    expect(mocks.voidBankDeposit).toHaveBeenCalledWith('ten_1', 'deposit_1')
  })
})
