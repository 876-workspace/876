import { Router } from 'express'

import { getSettings } from '@/config'
import { metricsText } from '@/platform/metrics'

import { databaseIsReady } from './health.repository'

export function createHealthRouter(): Router {
  const router = Router()
  router.get('/health', (_req, res) => {
    res.json({ object: 'health', status: 'ok', service: '@876/billing-api' })
  })
  router.get('/ready', async (_req, res) => {
    const ready = await databaseIsReady()
    res.status(ready ? 200 : 503).json({
      object: 'readiness',
      status: ready ? 'ready' : 'not_ready',
      service: '@876/billing-api',
      migration: ready ? 'current' : 'unavailable',
      writer: getSettings().billingWriter,
    })
  })
  router.get('/metrics', (_req, res) => {
    const settings = getSettings()
    res
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(metricsText(settings.environment, settings.billingWriter))
  })
  return router
}
