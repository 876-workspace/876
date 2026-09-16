import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { service } = vi.hoisted(() => ({
  service: { replayDelivery: vi.fn() },
}))

vi.mock('../webhooks.service.js', () => service)

const { createWebhooksInternalRouter } = await import('../webhooks.routes.js')

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  key = 'test-internal-key'
) {
  const app = express()
  app.use(express.json())
  app.use('/internal', createWebhooksInternalRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
})

describe('webhooks internal routes', () => {
  it('returns 401 without the internal key', async () => {
    const response = await requestJson(
      'POST',
      '/internal/webhook-deliveries/whdl_1/replay',
      { organizationId: 'org_1' },
      'wrong'
    )
    expect(response.status).toBe(401)
    expect(service.replayDelivery).not.toHaveBeenCalled()
  })

  it('replays a delivery', async () => {
    service.replayDelivery.mockResolvedValueOnce({
      data: { id: 'whdl_1', status: 'pending' },
      error: null,
    })
    const response = await requestJson(
      'POST',
      '/internal/webhook-deliveries/whdl_1/replay',
      { organizationId: 'org_1' }
    )
    expect(response.status).toBe(200)
    expect(service.replayDelivery).toHaveBeenCalledWith('org_1', 'whdl_1')
  })

  it('rejects replay without an organization', async () => {
    const response = await requestJson(
      'POST',
      '/internal/webhook-deliveries/whdl_1/replay',
      {}
    )
    expect(response.status).toBe(400)
    expect(service.replayDelivery).not.toHaveBeenCalled()
  })
})
