import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { service } = vi.hoisted(() => ({
  service: { getMetricsSummary: vi.fn() },
}))

vi.mock('../metrics.service.js', () => service)

const { createMetricsInternalRouter } = await import(
  '../metrics.internal-routes.js'
)

async function requestJson(path: string, key = 'test-internal-key') {
  const app = express()
  app.use(express.json())
  app.use('/internal', createMetricsInternalRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { 'x-internal-key': key },
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

describe('metrics internal routes', () => {
  it('returns 401 without the internal key', async () => {
    const response = await requestJson('/internal/metrics/summary', 'wrong')
    expect(response.status).toBe(401)
  })

  it('serves the metrics summary', async () => {
    service.getMetricsSummary.mockResolvedValueOnce({
      object: 'projects.metrics-summary',
      windowDays: 7,
    })
    const response = await requestJson('/internal/metrics/summary')
    expect(response.status).toBe(200)
    expect(
      (response.body as { data: { object: string } }).data.object
    ).toBe('projects.metrics-summary')
  })
})
