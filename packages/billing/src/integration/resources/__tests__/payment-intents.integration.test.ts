import { describe, expect, it, vi } from 'vitest'
import { createIntegrationPaymentIntentsResource } from '../payment-intents'

function integrationRuntime(fetchMock?: any) {
  const fn =
    fetchMock ??
    vi.fn().mockResolvedValue(
      Response.json({
        data: {
          object: 'payment_intent',
          id: 'pi_1',
          tenantId: 'ten_1',
          customerId: 'cus_1',
          invoiceId: null,
          subscriptionId: null,
          amount: '1000',
          amountCapturable: '0',
          amountReceived: '0',
          currency: 'USD',
          status: 'REQUIRES_PAYMENT_METHOD',
          captureMethod: 'AUTOMATIC',
          confirmationMethod: 'AUTOMATIC',
          paymentMethodId: null,
          mandateId: null,
          paymentMethodTypes: ['card'],
          setupFutureUsage: 'off_session',
          description: null,
          receiptEmail: null,
          statementDescriptor: null,
          statementDescriptorSuffix: null,
          lastPaymentError: null,
          nextAction: null,
          processing: null,
          attemptCount: 0,
          latestPaymentId: null,
          latestAttemptId: null,
          canceledAt: null,
          cancellationReason: null,
          provider: null,
          providerConnectionId: null,
          providerIntentId: null,
          idempotencyKey: null,
          metadata: null,
          createdAt: 1,
          updatedAt: 1,
        },
        error: null,
      })
    )
  return {
    baseUrl: 'https://billing.example.test',
    fetch: fn,
    apiKey: 'key',
    _fetchMock: fn,
  } as any
}

describe('IntegrationResources / PaymentIntents / apiKey path', () => {
  it('list — GETs with integration tenant', async () => {
    const rt = integrationRuntime(
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            url: '',
            total_count: 0,
          },
          error: null,
        })
      )
    )
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.list('org_1', { limit: 5 } as any)
    expect(rt._fetchMock).toHaveBeenCalled()
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/payment-intents')
  })

  it('create — POSTs to collection', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.create('org_1', {
      customerId: 'cus_1',
      amount: 1000 as any,
      currency: 'USD',
    } as any)
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('retrieve — encodes id', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.retrieve('org_1', 'pi/ special')
    expect(rt._fetchMock.mock.calls[0][0]).toContain(
      encodeURIComponent('pi/ special')
    )
  })

  it('confirm — POSTs to confirm', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.confirm('org_1', 'pi_1')
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/pi_1/confirm')
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('capture — POSTs to capture', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.capture('org_1', 'pi_1')
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/pi_1/capture')
  })

  it('cancel — POSTs to cancel with body', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentIntentsResource(rt as any)
    await res.cancel('org_1', 'pi_1', {
      cancellationReason: 'requested',
    } as any)
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/pi_1/cancel')
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('invalid-response guard returns error envelope (no throw)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: { object: 'payment_intent', id: 'pi_1' },
        error: null,
      })
    )
    const rt = integrationRuntime(fetchMock)
    const res = createIntegrationPaymentIntentsResource(rt as any)
    const out = await res.retrieve('org_1', 'pi_1')
    expect(out.error).toBeTruthy()
    expect(out.data).toBeNull()
  })
})
