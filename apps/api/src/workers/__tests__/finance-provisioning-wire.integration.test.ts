import { once } from 'node:events'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import type { FinanceProvisioningEvent } from '@876/server/finance-provisioning'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { deliverFinanceProvisioningEvent } from '../finance-provisioning-dispatch'

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'finance_evt_123',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_123:876-invoice',
    organization: {
      id: 'org_123',
      name: 'Test Org',
      slug: 'test-org',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: '876-invoice',
    entitlementReference: 'sub_123',
    manifestVersion: 1,
    provisioningRevision: 4,
    lifecycleVersion: 7,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.customers.write'],
    occurredAt: 1_787_000_000,
    ...overrides,
  }
}

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'finance_connection_123',
      tenantId: 'btenant_123',
      status: 'ACTIVE',
      lifecycleVersion: 7,
      applied: true,
      duplicate: false,
      ...overrides,
    },
    error: null,
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let body = ''
  req.setEncoding('utf8')
  for await (const chunk of req) body += chunk
  return JSON.parse(body)
}

async function withBillingPeer<T>(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  run: (baseUrl: string) => Promise<T>
): Promise<T> {
  const server = createServer((req, res) => {
    void Promise.resolve(handler(req, res)).catch((error) => {
      res.statusCode = 500
      res.end(String(error))
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test port.')

  try {
    return await run(`http://127.0.0.1:${address.port}`)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe('API → Billing finance provisioning wire contract', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends the canonical event and accepts a receipt proving exact persisted state', async () => {
    await withBillingPeer(
      async (req, res) => {
        expect(req.method).toBe('POST')
        expect(req.url).toBe('/api/v1/admin/finance-connections/ensure')
        expect(req.headers['x-internal-key']).toBe('shared-secret')
        expect(req.headers['x-request-id']).toBe('finance_evt_123')
        expect(await readBody(req)).toEqual(event())
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(receipt()))
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
            exactState: true,
          })
        ).resolves.toMatchObject({
          tenantId: 'btenant_123',
          status: 'ACTIVE',
          lifecycleVersion: 7,
        })
      }
    )
  })

  it('rejects a 2xx response with malformed JSON', async () => {
    await withBillingPeer(
      (_req, res) => {
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        res.end('{not-json')
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
          })
        ).rejects.toMatchObject({ issue: 'invalid-response' })
      }
    )
  })

  it('rejects a success-shaped body that does not match the shared envelope', async () => {
    await withBillingPeer(
      (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
          })
        ).rejects.toMatchObject({ issue: 'invalid-response' })
      }
    )
  })

  it('rejects a wrong persisted state at the requested lifecycle', async () => {
    await withBillingPeer(
      (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(receipt({ status: 'SUSPENDED' })))
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
            exactState: true,
          })
        ).rejects.toMatchObject({ issue: 'state-mismatch' })
      }
    )
  })

  it('allows a background replay to observe a newer state but blocks foreground readiness', async () => {
    await withBillingPeer(
      (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(
          JSON.stringify(
            receipt({ lifecycleVersion: 8, status: 'SUSPENDED', applied: false })
          )
        )
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
          })
        ).resolves.toMatchObject({ lifecycleVersion: 8, status: 'SUSPENDED' })

        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
            exactState: true,
          })
        ).rejects.toMatchObject({ issue: 'superseded-response' })
      }
    )
  })

  it.each([401, 403, 409, 429, 500, 502, 503, 504])(
    'does not turn Billing HTTP %s into a delivered event',
    async (status) => {
      await withBillingPeer(
        (_req, res) => {
          res.statusCode = status
          res.end(`failure-${status}`)
        },
        async (baseUrl) => {
          await expect(
            deliverFinanceProvisioningEvent({
              eventId: 'finance_evt_123',
              payload: event(),
              billingUrl: baseUrl,
              internalKey: 'shared-secret',
            })
          ).rejects.toThrow(`Billing returned HTTP ${status}`)
        }
      )
    }
  )

  it('rejects an outbox id/payload id mismatch before making the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(
      deliverFinanceProvisioningEvent({
        eventId: 'finance_evt_other',
        payload: event(),
        billingUrl: 'https://billing.invalid',
        internalKey: 'shared-secret',
      })
    ).rejects.toMatchObject({ issue: 'invalid-event' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a malformed outgoing event before making the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(
      deliverFinanceProvisioningEvent({
        eventId: 'finance_evt_123',
        payload: { ...event(), scopes: ['read'] },
        billingUrl: 'https://billing.invalid',
        internalKey: 'shared-secret',
      })
    ).rejects.toMatchObject({ issue: 'invalid-event' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails on a hung Billing peer instead of reporting delivery', async () => {
    await withBillingPeer(
      async (_req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        if (!res.destroyed) res.end(JSON.stringify(receipt()))
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
            timeoutMs: 10,
          })
        ).rejects.toBeDefined()
      }
    )
  })

  it('fails on a peer connection reset instead of reporting delivery', async () => {
    await withBillingPeer(
      (req) => {
        req.socket.destroy()
      },
      async (baseUrl) => {
        await expect(
          deliverFinanceProvisioningEvent({
            eventId: 'finance_evt_123',
            payload: event(),
            billingUrl: baseUrl,
            internalKey: 'shared-secret',
          })
        ).rejects.toBeDefined()
      }
    )
  })
})
